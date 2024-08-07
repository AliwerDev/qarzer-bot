const _ = require("lodash");
const TelegramBot = require("node-telegram-bot-api");
var cachegoose = require("recachegoose");

const User = require("../models/user");
const Group = require("../models/group");
const Expense = require("../models/expense");

const { mainKeys, keys, groupKeys, noCurrentGroupKeys, botSteps, onlyHomePageKey, expenseKeys, texts } = require("./keys");
const { getFullName, reminderText, formatMoney, generateAccessUrl, getIdFromText } = require("../utils/functions");
const moment = require("moment");

const getDescriptionFronExpenseDesc = (desc) => {
  return desc.slice(desc.lastIndexOf(":") + 2);
};

class QarzerBot {
  constructor(TG_TOKEN) {
    this.bot = new TelegramBot(TG_TOKEN, { polling: true });
    this.bot.on("message", this.handleMessage.bind(this));
    this.bot.on("callback_query", this.handleCallbackQuery.bind(this));
  }

  // MESSAGE HANDLER
  handleMessage = async (msg) => {
    const chatId = msg.from.id;
    const message = msg.text;

    // USER CHECKING
    const user = await this.getUser(chatId);
    if (!user) return this.createUser(chatId, msg);

    // CHECK BOT STEPS
    if (message === keys.homePage || message === keys.home) return this.clickBack(user);
    if (user.botStep === botSteps.groupName) return this.enterGroupName(user, message);
    if (user.botStep === botSteps.groupCurrency) return this.enterGroupCurrency(user, message);

    // creating expense steps
    if (user.botStep === botSteps.expensDescription) return this.enterExpensDesc(user, message);
    if (user.botStep === botSteps.expensAmount) return this.enterExpensAmount(user, message);

    // pay expense steps
    if (user.botStep === botSteps.payExpenseAmount) return this.enterPayExpenseAmount(user, message);

    // new functions
    if (_.startsWith(message, keys.message)) return this.sendMessageToGroup(user, message);
    if (_.startsWith(message, keys.join)) return this.joinGroup(user, message);

    if (msg.reply_to_message && _.startsWith(msg.reply_to_message.text, texts.qarzBiriktirildi)) return this.replyFeedback(user, msg);

    // CHECKING MESSAGE
    switch (message) {
      case keys.start:
        this.clickBotStart(user);
        break;
      case keys.menu:
        this.clickBotMenu(user);
        break;
      case keys.createExpens:
        this.clickCreateExpens(user);
        break;
      case keys.myExpenses:
        this.clickMyExpenses(user);
        break;
      case keys.payExpense:
        this.clickPayExpense(user);
        break;
      case keys.group:
        this.clickGroupMenu(user);
        break;
      case keys.createGroup:
        this.clickCreateGroup(user);
        break;
      case keys.myGroups:
        this.clickMyGroups(user);
        break;
      case keys.members:
        this.clickGroupMembers(user);
        break;
      case keys.change_name:
        this.clickChangeName(user);
        break;
      case keys.group_link:
        this.clickGroupLink(user);
        break;
      case keys.clear:
        this.clickClear(msg);
        break;
      case "test":
        this.test(user, msg);
        break;
      default:
        this.bot.deleteMessage(chatId, msg.message_id);
    }
  };

  // CALLBACK HANDLER
  handleCallbackQuery = async (query) => {
    const chatId = query.from.id;
    const user = await User.findOne({ chatId }).cache(300, chatId);

    if (query.data.startsWith("CURRENT_GROUP")) return this.changeCurrentGroup(user, query);
    if (query.data.startsWith("CHOOSE_DEBTOR")) return this.chooseDebtors(user, query);
    if (query.data.startsWith("REMOVE_DEBTOR")) return this.chooseDebtors(user, query, true);
    if (query.data.startsWith("DISTRIBUTATION")) return this.chooseDistributionType(user, query);
    if (query.data.startsWith("CONFIRMATION")) return this.createExpense(user, query);
    if (query.data.startsWith("ACTIVE_EXPENSE")) return this.clickActiveExpenseList(user, query.data.slice(14), query.message.message_id);
    if (query.data.startsWith("MY_EXPENSE_PAGE")) return this.clickCreatedByMe(user, query.data.slice(15), query.message.message_id);
    if (query.data.startsWith("MY_EXPENSE")) return this.mySingleExpense(user, query);
    if (query.data.startsWith("REMINDER")) return this.reminderExpense(user, query);
    if (query.data.startsWith("PAY_EXPENSE_ACCEPTED")) return this.payExpenseAccepted(user, query);
    if (query.data.startsWith("PAY_EXPENSE_REJECTED")) return this.payExpenseRejected(user, query);
    if (query.data.startsWith("PAY_EXPENSE_CANCELED")) return this.payExpenseCanceled(user, query);
    if (query.data.startsWith("PAY_EXPENSE")) return this.payExpense(user, query);
    if (query.data.startsWith("HISTORY")) return this.expenseHistory(user, query);
    if (query.data.startsWith("DELETE_MSG")) return this.bot.deleteMessage(chatId, query.message.message_id);
  };

  // MENU CLICK FUNCTIONS
  clickBotStart(user) {
    if (user.botStep) {
      user.botStep = "";
      user.save();
    }
    this.sendMessage(user, "🎉 Qarz kalkulyator botiga xush kelibsiz!\n\n <i>Bot dan foydalanish - https://youtu.be/SS4JFC_L-yE</i>");
  }

  clickBotMenu(user) {
    this.sendMessage(user, "Menu ⬇️", { keys: mainKeys });
  }

  clickCreateExpens = async (user) => {
    const group = await Group.findById(user.currentGroupId).cache(300, user.currentGroupId);
    if (group?.members?.length <= 1) {
      let alert = "Qarz yaratish uchun guruhda kamida 2 kishi bo'lishi kerak!\n\n";
      if (String(group.creatorId) === String(user._id)) alert += `Guruhga qo'shilish uchun message: <code>join/${group._id}</code>`;
      return this.sendMessage(user, alert);
    }

    this.sendMessage(user, "💵 Pul miqdorini kiriting:", { keys: onlyHomePageKey });
    user.botStep = botSteps.expensAmount;
    user.save();
  };

  clickMyExpenses = async (user) => {
    const expenses = await this.getMyExpenses(user);
    if (expenses.length === 0) return this.sendMessage(user, "Sizda qarzlar mavjud emas!");

    let text = "<b>🗒 Umumiy qarzlaringiz | qarz tarixini ko'rish uchun o'sha tugmani bosing:</b> \n\n";
    text += "<i>➕ Sizdan qarz, ➖ Siz qarzsiz</i>";

    const inlineKeys = [];

    expenses.map(({ name, currency, amount, _id }, i) => {
      inlineKeys.push([{ text: `${name.trim()}:  ${amount > 0 ? "+" : ""}${formatMoney(currency, amount)}`, callback_data: `HISTORY ${_id}` }]);
    });

    this.sendMessage(user, text, { keys: inlineKeys, isInline: true });
  };

  clickActiveExpenseList = async (user, pageNumber = 0, msgId) => {
    const pageCount = 5;
    const expenses = await Expense.find({ status: "active", relatedTo: user._id })
      .limit(pageCount)
      .skip(pageNumber * pageCount)
      .populate("creatorId", "firstName lastName chatId");

    if (pageNumber === 0 && !expenses.length) return this.sendMessage(user, "💸<b>Sizga hali qarz biriktirilmagan!</b>\n\n", { keys: expenseKeys });

    let text = "💸<b>Sizga biriktirilgan qarzlar ro'yxati : </b>\n\n";
    expenses.forEach((exp, i) => {
      text += `${pageNumber * pageCount + i + 1}. <b>${formatMoney(exp.currency, exp.amount)}</b>\n`;
      text += `Kimga: <a href="tg://user?id=${exp.creatorId.chatId}">${getFullName(exp.creatorId)}</a>\n`;
      text += `Sharx: ${exp.description}\n`;
      text += `<i> 🕧${moment(exp.createdAt).format("DD.MM.YYYY HH:mm")}</i>\n\n`;
    });

    const inlineKeys = [[]];
    if (pageNumber > 0) inlineKeys[0].push({ text: "◀️", callback_data: `ACTIVE_EXPENSE ${+pageNumber - 1}` });
    if (expenses.length > 0 && expenses.length === pageCount) inlineKeys[0].push({ text: "▶️", callback_data: `ACTIVE_EXPENSE ${+pageNumber + 1}` });

    this.sendMessage(user, text, { keys: inlineKeys, isInline: true, editMsgId: msgId });
  };

  clickCreatedByMe = async (user, pageNumber = 0, msgId) => {
    const pageCount = 6;
    const expenses = await Expense.find({ status: "active", creatorId: user._id })
      .limit(pageCount)
      .skip(pageNumber * pageCount)
      .populate("relatedTo", "firstName lastName chatId");

    if (pageNumber === 0 && !expenses.length) return this.sendMessage(user, "💸<b>Siz hali qarz yaratmagansiz!</b>\n\n", { keys: expenseKeys });

    let text = "💸<b>Siz yaratgan qarzlar ro'yxati: </b>\n\n";
    expenses.forEach((exp, i) => {
      text += `${pageNumber * pageCount + i + 1}. <b>${formatMoney(exp.currency, exp.amount)}</b>\n`;
      text += `Qarzdor: <a href="tg://user?id=${exp.relatedTo.chatId}">${getFullName(exp.relatedTo)}</a>\n`;
      text += `Sharx: ${exp.description}\n`;
      text += `<i>🕧 ${moment(exp.createdAt).format("DD.MM.YYYY HH:mm")}</i>\n\n`;
    });

    const inlineKeys = [[], [], []];
    for (let i = 0; i < expenses.length; i++) {
      inlineKeys[i >= 3 ? 1 : 0].push({ text: pageNumber * pageCount + i + 1, callback_data: `MY_EXPENSE ${String(expenses[i]._id)}` });
    }

    if (pageNumber > 0) inlineKeys[2].push({ text: "◀️", callback_data: `MY_EXPENSE_PAGE ${+pageNumber - 1}` });
    if (expenses.length > 0 && expenses.length === pageCount) inlineKeys[2].push({ text: "▶️", callback_data: `MY_EXPENSE_PAGE ${+pageNumber + 1}` });

    this.sendMessage(user, text, { keys: inlineKeys, isInline: true, editMsgId: msgId });
  };

  clickPayExpense = async (user) => {
    let expenses = await this.getMyExpenses(user);
    expenses = _.filter(expenses, (val) => val.amount < 0);

    if (!expenses.length) return this.sendMessage(user, "Hozirda siz qarzdor emassiz!", { keys: expenseKeys });
    const inlineKeys = [];

    expenses.map((expense) => {
      inlineKeys.push([{ text: `${expense.name} ${formatMoney(expense.currency, expense.amount)}`, callback_data: `PAY_EXPENSE ${expense._id}` }]);
    });

    this.sendMessage(user, "Sizning qarzlaringiz, kimga to'lamoqchiligingizni tanlang:", { keys: inlineKeys, isInline: true });
  };

  clickGroupMenu(user) {
    this.sendMessage(user, "Guruh sozlamalari⬇️", { keys: groupKeys });
    Group.findById(user.currentGroupId)
      .cache(300, user.currentGroupId)
      .then((group) => {
        if (String(group.creatorId) === String(user._id)) {
          const inlineKey = [[{ text: "Veb sahifaga kirish", url: generateAccessUrl(user._id, group._id) }]];
          this.sendMessage(user, "Guruhingizni veb sahifadan ham boshqarishingiz mumkin", { keys: inlineKey, isInline: true });
        }
      });
  }

  clickCreateGroup(user) {
    this.sendMessage(user, "Guruh nomini kiriting:", { keys: onlyHomePageKey });
    user.botStep = botSteps.groupName;
    user.save();
  }

  clickMyGroups(user) {
    Group.find({ members: user._id })
      .then((groups) => {
        const currentGroup = groups.find((g) => String(g._id) === String(user.currentGroupId));

        let listMessage = `Joriy guruh: <b>${currentGroup.name}</b>\n`;
        listMessage += `Guruhga qo'shilish uchun message: <code>join/${currentGroup._id}</code>\n\n`;

        if (groups.length > 1) listMessage += "Joriy guruhni almashtirish uchun tanlang:";
        const inlineKeys = groups.filter((g) => String(g._id) !== String(user.currentGroupId)).map((group) => [{ text: group.name, callback_data: "CURRENT_GROUP " + String(group._id) }]);
        this.sendMessage(user, listMessage, { keys: inlineKeys, isInline: true });
      })
      .catch((err) => console.log(err));
  }

  clickGroupMembers(user) {
    Group.findById(user.currentGroupId)
      .populate("members")
      .then((group) => {
        let listMessage = `<b>${group.name}</b>\n\n`;
        group.members?.forEach((user, index) => {
          listMessage += `${index + 1}. <a href="tg://user?id=${user.chatId || user.userName}">${getFullName(user)}</a>\n`;
        });
        this.sendMessage(user, listMessage, { keys: groupKeys });
      });
  }

  clickChangeName(user) {
    user.botStep = botSteps.changeUserName;
    user.save().then(() => this.sendMessage(user, "✏️ Ism familyangizni kiriting: \n\n <i>Misol: Alisher O'rolov</i>", { keys: onlyHomePageKey }));
  }

  clickGroupLink(user) {
    const text = `Guruhga qo'shilish uchun ushbu messageni do'stlaringiz @qarzer_bot ga yuborishi kerak! \n\nMessage: <code>join/${user.currentGroupId}</code>`;
    this.sendMessage(user, text);
  }

  clickBack(user) {
    if (user.incomplatedExpense.amount || user.incomplatedExpense.description) user.incomplatedExpense = { debtors: [] };
    if (user.incomplatedGroupName) user.incomplatedGroupName = "";
    if (user.payExpenseTo) user.payExpenseTo = undefined;

    user.botStep = "";
    user.save().then(() => this.sendMessage(user, "🏠 Asosiy bo'lim!"));
  }

  clickClear(msg) {
    for (let i = 0; i < 101; i++) {
      this.bot.deleteMessage(msg.chat.id, msg.message_id - i).catch((er) => {
        return;
      });
    }
  }

  test(user, msg) {
    this.bot.sendChatAction(user.chatId, "typing");

    // Simulate processing time (you can replace this with actual processing logic)
    setTimeout(() => {
      // Once processing is complete, send a message
      this.sendMessage(user, "Processing complete!");
    }, 5000);
  }

  // BOT FUNCTIONS
  async createUser(chatId, msg) {
    const { first_name, last_name, username } = msg.from;
    const userData = { firstName: first_name, lastName: last_name, username, chatId };

    try {
      const user = new User(userData);
      await user.save();
      this.clickBotStart(user);
    } catch (error) {
      console.error("Error creating user:", error);
    }
  }

  async getUser(chatId) {
    try {
      return await User.findOne({ chatId }).cache(300, chatId);
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  }

  async getMyExpenses(user) {
    const expenses = await Expense.find({ status: "active", $or: [{ creatorId: user._id }, { relatedTo: user._id }] }).populate("creatorId relatedTo", "firstName lastName chatId");
    const expensesObject = {};

    const { currency, members } = await Group.findById(user.currentGroupId).populate("members");
    members.forEach((member) => {
      if (String(member._id) !== String(user._id)) expensesObject[member.chatId] = { name: getFullName(member), _id: member._id, currency, amount: 0 };
    });

    expenses.forEach((exp) => {
      if (exp.creatorId.chatId === user.chatId) {
        if (expensesObject[exp.relatedTo.chatId]) expensesObject[exp.relatedTo.chatId].amount += exp.amount;
      } else {
        if (expensesObject[exp.creatorId.chatId]) expensesObject[exp.creatorId.chatId].amount -= exp.amount;
      }
    });

    return Object.values(expensesObject);
  }

  replyFeedback(user, msg) {
    const replyMsg = msg.reply_to_message;

    const chatId = getIdFromText(replyMsg.text);
    if (!chatId) return;
    this.bot.sendMessage(chatId, `Sizga "${getDescriptionFronExpenseDesc(replyMsg.text)}" qarzingiz yuzasidan xabar keldi:`).then(() => this.bot.forwardMessage(chatId, user.chatId, msg.message_id).then(() => this.sendMessage(user, "Xabaringiz yuborildi!")));
  }

  messageOptions(keys, isInline = false, withoutKey = false) {
    const opts = {
      parse_mode: "HTML",
      reply_markup: {
        resize_keyboard: true,
        // one_time_keyboard: true,
      },
    };

    if (withoutKey) return opts;

    if (!isInline) opts.reply_markup.keyboard = keys;
    else opts.reply_markup.inline_keyboard = keys;

    return opts;
  }

  sendMessage(user, message, { keys = mainKeys, isInline = false, chatId, withoutKey = false, editMsgId = null } = {}) {
    chatId = chatId || user.chatId;

    let options = this.messageOptions(keys, isInline, withoutKey);
    if (!user.currentGroupId && !_.isEqual(keys, onlyHomePageKey)) options = this.messageOptions(noCurrentGroupKeys);
    if (editMsgId) this.bot.editMessageText(message, { chat_id: chatId, message_id: editMsgId, ...options });
    else this.bot.sendMessage(chatId, message, options);
  }

  enterPayExpenseAmount = async (user, amount) => {
    if (amount !== "ALL" && (!_.isNumber(+amount) || _.isNaN(+amount) || amount <= 0)) return this.sendMessage(user, "Pul miqdori xato kiritilgan, iltimos qaytadan kiriting❗️", { keys: onlyHomePageKey });
    const partnerId = user.payExpenseTo;

    User.findById(partnerId)
      .then((partner) => {
        const inlineKeys = [
          [
            { text: "❌ Bekor qilish", callback_data: `PAY_EXPENSE_REJECTED ${user._id}` },
            { text: "✅ Tasdiqlash", callback_data: `PAY_EXPENSE_ACCEPTED ${user._id}` },
          ],
        ];

        const msgForPartner = `<a href="tg://user?id=${user.chatId}">${getFullName(user)}</a> sizga ${amount === "ALL" ? "hamma" : formatMoney("UZS", +amount)} qarzini to'laganligini tasdiqlaysizmi`;
        const msg = `<b>⏳Sizning to'lovingiz <a href="tg://user?id=${partner.chatId}">${getFullName(partner)}</a> ga yuborildi.</b>\n\n<i>To'lov tasdiqlanishini kuting!</i>`;

        this.sendMessage(user, msgForPartner, { keys: inlineKeys, chatId: partner.chatId, isInline: true });

        user.botStep = "";
        user.payExpenseAmount = amount + "";
        user.save().then(() => this.sendMessage(user, msg));
      })
      .catch(() => {});
  };

  enterExpensAmount = async (user, amount) => {
    if (!_.isNumber(+amount) || _.isNaN(+amount) || amount <= 0) return this.sendMessage(user, "Pul miqdori xato kiritilgan, iltimos qaytadan kiriting❗️", { keys: onlyHomePageKey });
    const group = await Group.findById(user.currentGroupId);

    user.incomplatedExpense.amount = amount;
    user.incomplatedExpense.currency = group.currency;
    user.botStep = botSteps.expensDescription;
    user.save().then(() => this.sendMessage(user, "📄 Qarz sharxini kiriting:", { keys: onlyHomePageKey }));
  };

  enterExpensDesc(user, desc) {
    this.displayChooseDeptors(user);
    user.incomplatedExpense.description = desc;
    user.botStep = botSteps.chooseDebtors;
    user.save();
  }

  displayChooseDeptors(user, choosedIds = [], msgId) {
    Group.findById(user.currentGroupId)
      .populate("members")
      .cache(300, user.currentGroupId)
      .then(({ members }) => {
        let inlineKeys;

        if (choosedIds.includes("ALL")) {
          inlineKeys = [[{ text: `ALL ✅`, callback_data: "REMOVE_DEBTOR ALL" }]];
        } else {
          inlineKeys = members
            .filter((m) => String(m._id) !== String(user._id))
            .map((member) => {
              let isChoosed = choosedIds?.find((id) => String(member._id) === id);

              return [{ text: `${getFullName(member)} ${isChoosed ? "✅" : ""}`, callback_data: (isChoosed ? "REMOVE_DEBTOR " : "CHOOSE_DEBTOR ") + String(member._id) }];
            });
          if (!choosedIds?.length) inlineKeys.unshift([{ text: `ALL`, callback_data: "CHOOSE_DEBTOR ALL" }]);
        }

        if (choosedIds?.length) {
          inlineKeys.push([{ text: "Davom ettirish ➡️", callback_data: "CHOOSE_DEBTOR DONE" }]);
        }

        this.sendMessage(user, "Qarzdorlarni tanlang:", { keys: inlineKeys, isInline: true, editMsgId: msgId });
      });
  }

  enterGroupName(user, message) {
    user.incomplatedGroupName = message;
    user.botStep = botSteps.groupCurrency;
    user.save().then((g) => {
      this.sendMessage(user, `Guruh uchun pul birligini kiriting: \nExample: <code>UZS</code>, <code>USD</code>, ...`, { keys: onlyHomePageKey });
    });
  }

  enterGroupCurrency(user, message) {
    if (_.isNumber(message) || message.length > 4) return this.sendMessage(user, `Pul birligi harf yoki belgilardan iborat va uzunligi 4 belgidan oshmasligi kerak! iltimos qaytadan kiriting:`, { keys: onlyHomePageKey });
    const group = new Group({ name: user.incomplatedGroupName, currency: message, creatorId: user._id, members: [user._id] });

    group
      .save()
      .then((g) => {
        user.currentGroupId = g._id;
        user.botStep = "";
        user.save();
        const text = `<i>Guruhga qo'shilish uchun do'stlaringiz ushbu messageni bot ga yuborishi kerak! \nMessage: <code>join/${g._id}</code></i>`;
        this.sendMessage(user, `<b>"${g.name}"</b> - guruh muvaffaqqiyatli yaratildi!\n\n${text}`);
      })
      .catch((err) => console.log(err));
  }

  joinGroup(user, message) {
    const groupId = message.split("/")[1];
    if (!groupId) this.sendMessage(user, "Bunday guruh mavjud emas!");

    Group.findOneAndUpdate({ _id: groupId }, { $addToSet: { members: user._id } })
      .then((group) => {
        user.currentGroupId = groupId;
        cachegoose.clearCache(user.currentGroupId);
        user.save().then(() => this.sendMessage(user, `Tabriklaymiz siz <code>${group.name}</code> guruhiga muvaffaqqiyatli qo'shildingiz!`));
      })
      .catch((err) => this.sendMessage(user, "Bunday guruh mavjud emas!"));
  }

  changeUserName(user, message) {
    if (!message || message.length < 3) return this.sendMessage(user, "Ism familyani xato kiritdingiz, iltimos qaytadan kiriting!", { keys: onlyHomePageKey });
    const [firstName, lastName] = message.split(" ");
    user.firstName = firstName?.trim();
    user.lastName = lastName?.trim();
    user.botStep = "";
    user.save().then(() => this.sendMessage(user, `Ism familyangiz <code>${getFullName(user)}</code> ga o'zgartirildi!`));
  }

  sendMessageToGroup = async (user, message) => {
    message = _.trim(message.slice(8));

    if (!_.isString(message)) return;
    const { members } = await Group.findOne({ _id: user.currentGroupId }).populate("members");
    for (const member of members) {
      if (member.chatId === user.chatId) continue;
      this.sendMessage(user, `${getFullName(user)}: ${message}`, { chatId: member.chatId });
    }
    user.botStep = "";
    user.save();
    return this.sendMessage(user, "Habar yuborildi!");
  };

  // CALLBACK QUEARY FUNCTIONS
  changeCurrentGroup = (user, query) => {
    // CURRENT_GROUP
    const groupId = query.data.slice(14);
    user.currentGroupId = groupId;

    user.save().then(() => {
      this.bot.deleteMessage(query.from.id, query.message.message_id).then(() => this.sendMessage(user, `Joriy guruhingiz muvaffaqqiyatli o'zgartirildi!`));
    });
  };

  chooseDebtors = async (user, query, isBeforeChoosed) => {
    // CHOOSE_DEBTOR
    // REMOVE_DEBTOR
    const debtorId = query.data.slice(14);
    const msgId = query.message.message_id;

    if (debtorId === "DONE") {
      user.botStep = botSteps.distributionType;
      user.save();
      const money = formatMoney(user.incomplatedExpense.currency, user.incomplatedExpense.amount);
      this.bot.deleteMessage(user.chatId, msgId);

      let text = "🧮 Kiritilgan pull miqdori qanday taqsimlansin: \n\n";
      text += `1. Tanlanganlarga ${money} dan qarz yozilsin. \n`;
      text += `2. Tanlanganlarga ${money} teng bo'linib qarz yozilsin. \n`;
      text += `3. Tanlanganlarga va o'zimga ${money} teng bo'linib qarz yozilsin.\n`;

      const inlineKeys = [
        [
          { text: "1️⃣", callback_data: "DISTRIBUTATION 1" },
          { text: "2️⃣", callback_data: "DISTRIBUTATION 2" },
          { text: "3️⃣", callback_data: "DISTRIBUTATION 3" },
        ],
      ];

      this.sendMessage(user, text, { keys: inlineKeys, isInline: true });
      return;
    }

    if (isBeforeChoosed) {
      user.incomplatedExpense.debtors = user.incomplatedExpense.debtors?.filter((item) => item !== debtorId);
    } else {
      user.incomplatedExpense.debtors = user.incomplatedExpense.debtors || [];
      user.incomplatedExpense.debtors.push(debtorId);
    }
    user.save().then(() => this.displayChooseDeptors(user, user.incomplatedExpense.debtors, msgId));
  };

  chooseDistributionType = async (user, query) => {
    const type = query.data.slice(-1);
    const msgId = query.message.message_id;
    const amount = user.incomplatedExpense.amount;
    let debtorsCount = 0;

    if (user.incomplatedExpense.debtors?.find((item) => item === "ALL")) {
      const group = await Group.findById(user.currentGroupId).cache(300, user.currentGroupId);
      debtorsCount = group.members.length - 1;
      user.incomplatedExpense.debtors = group.members.filter((item) => String(item) !== String(user._id));
    } else debtorsCount = user.incomplatedExpense.debtors?.length;

    let amountForOneDebtor = type === "1" ? amount : type === "2" ? amount / debtorsCount : amount / (debtorsCount + 1);
    amountForOneDebtor = _.round(amountForOneDebtor, 2);

    user.incomplatedExpense.amountForOneDebtor = amountForOneDebtor;
    user.botStep = "";
    user.save();

    this.bot.deleteMessage(user.chatId, msgId);

    let text = "<b>Qarz: </b> \n\n";
    text += `Sharx:  <code>${user.incomplatedExpense.description}</code> \n`;
    text += `Umumiy qiymati:  <code>${formatMoney(user.incomplatedExpense.currency, amountForOneDebtor * debtorsCount)}</code> \n`;
    text += `Qarzdorlar soni:  <code>${debtorsCount}</code> \n`;
    text += `Har bir kishiga tog'ri keluvchi summa: <code>${formatMoney(user.incomplatedExpense.currency, amountForOneDebtor)}</code> \n\n`;
    text += `Hammasi tog'riligini tasdiqlang:`;
    const inlineKeys = [[{ text: "✅ TASDIQLASH", callback_data: "CONFIRMATION" }]];

    this.sendMessage(user, text, { keys: inlineKeys, isInline: true });
  };

  createExpense = async (user, query) => {
    const msgId = query.message.message_id;
    const expenses = user.incomplatedExpense.debtors?.map((debtorId) => ({
      amount: user.incomplatedExpense.amountForOneDebtor,
      groupId: user.currentGroupId,
      creatorId: user._id,
      description: user.incomplatedExpense.description,
      relatedTo: debtorId,
      currency: user.incomplatedExpense.currency,
    }));

    user.incomplatedExpense = { debtors: [] };
    user.save();

    Expense.create(expenses).then((exp) => {
      this.bot.deleteMessage(user.chatId, msgId).then(() => this.sendMessage(user, `🎉 ${exp[0]?.description} \qqarzlar muvaffaqqiyatli yaratildi!`));
      const expIds = exp.map((item) => item._id);

      Expense.find({ _id: expIds })
        .populate("relatedTo", "chatId")
        .then((newExps) => {
          newExps.map((item) => {
            const expensText = `${texts.qarzBiriktirildi}\n\n🔧${user.chatId}\n💆‍♂️Kimdan: <a href="tg://user?id=${user.chatId}">${getFullName(user)}</a>\n💵Qarz miqdori: ${formatMoney(item.currency, item.amount)}\n📃Sharx: ${item.description}`;
            this.sendMessage(user, expensText, { chatId: item.relatedTo.chatId });
          });
        });
    });
  };

  reminderExpense = async (user, query) => {
    // REMINDER
    const expensId = query.data.slice(9);
    const expense = await Expense.findById(expensId).populate("relatedTo");
    const message = reminderText();

    let text = `📩 Sizga ${getFullName(user)} dan eslatma keldi:\n\n`;
    text += `<pre>${message}</pre>\n\n`;
    text += `<b>Qarzingiz: ${formatMoney(expense.currency, expense.amount)}</b>\n`;
    text += `Kimdan: <a href="tg://user?id=${expense.relatedTo.chatId}">${getFullName(expense.relatedTo)}</a>\n`;
    text += `Sharx: ${expense.description}\n`;
    text += `<i>🕧 ${moment(expense.createdAt).format("DD.MM.YYYY HH:mm")}</i>\n\n`;

    this.sendMessage(user, text, { chatId: expense.relatedTo.chatId });
    this.bot.answerCallbackQuery(query.id).then(() => this.sendMessage(user, `Qarzdorga ushbu eslatmangiz yuborildi: \n <pre>${message}</pre>`, { keys: expenseKeys }));
  };

  changeToPaid = async (user, query) => {
    const msgId = query.message.message_id;

    const expensId = query.data.slice(5);
    await Expense.findByIdAndUpdate(expensId, { status: "paid" });
    this.bot.deleteMessage(user.chatId, msgId).then(() => this.sendMessage(user, `Qarz "To'langan qarzlar" bo'limiga muvaffaqqiyatli o'tkazildi!`, { keys: expenseKeys }));
  };

  payExpenseRejected = (user, query) => {
    const partnerId = query.data.replace("PAY_EXPENSE_REJECTED ", "");
    const msgId = query.message.message_id;

    User.findById(partnerId)
      .then((partner) => {
        this.bot.deleteMessage(user.chatId, msgId);
        const msg = `🔴 <a href="tg://user?id=${user.chatId}">${getFullName(user)}</a> sizning to'lovingizni rad etdi!`;
        partner.payExpenseAmount = "";
        partner.save().then(() => this.sendMessage(user, msg, { withoutKey: true, chatId: partner.chatId }));
      })
      .catch(() => {});
  };

  payExpenseAccepted = async (user, query) => {
    const partnerId = query.data.replace("PAY_EXPENSE_ACCEPTED ", "");
    const msgId = query.message.message_id;

    const complated = (partner) => {
      const msgToPartner = `🟢 <a href="tg://user?id=${user.chatId}">${getFullName(user)}</a> to'lovingiz qabul qilindi!`;
      const msg = `🟢Siz <a href="tg://user?id=${partner.chatId}">${getFullName(partner)}</a> to'lovini qabul qilindingiz!`;

      this.bot.deleteMessage(user.chatId, msgId);
      this.sendMessage(user, msgToPartner, { withoutKey: true, chatId: partner.chatId });
      this.sendMessage(user, msg, { withoutKey: true });
    };

    User.findById(partnerId)
      .then((partner) => {
        if (!partner.payExpenseAmount) {
          this.sendMessage(user, "Bu so'rov muddati tugagan!", { withoutKey: true });
        } else if (partner.payExpenseAmount === "ALL")
          Expense.updateMany({ status: "active", $and: [{ $or: [{ creatorId: user._id }, { creatorId: partnerId }] }, { $or: [{ relatedTo: user._id }, { relatedTo: partnerId }] }] }, { status: "paid" }).then(() => {
            complated(partner);
          });
        else {
          const expense = {
            amount: +partner.payExpenseAmount,
            groupId: user.currentGroupId,
            creatorId: partner._id,
            currency: "UZS",
            status: "active",
            description: "QARZ TO'LOVI",
            relatedTo: user._id,
          };

          Expense.create(expense).then(() => {
            complated(partner);
          });
        }
      })
      .catch(() => {});
  };

  payExpenseCanceled = (user, query) => {
    const msgId = query.message.message_id;
    this.bot.deleteMessage(user.chatId, msgId);
    this.clickBack(user);
  };

  expenseHistory = async (user, query) => {
    const pageCount = 10;
    const [name, partnerId, pageNumber = 0] = query.data.split(" ");

    const msgId = query.message.message_id;
    const findQuery = { $and: [{ $or: [{ creatorId: user._id }, { creatorId: partnerId }] }, { $or: [{ relatedTo: user._id }, { relatedTo: partnerId }] }] };

    const expenses = await Expense.find(findQuery)
      .limit(pageCount)
      .skip(pageNumber * pageCount)
      .sort({ createdAt: -1 })
      .populate("creatorId relatedTo", "firstName lastName chatId");

    const total = await Expense.countDocuments(findQuery);

    const partner = _.isEqual(String(expenses[0]?.relatedTo._id), partnerId) ? expenses[0]?.relatedTo : expenses[0]?.creatorId;

    let text = `<b>${getFullName(partner)} bilan o'rtangizdagi qarzlar tarixi</b>\n\n`;

    expenses.forEach((exp, i) => {
      text += `${pageNumber * pageCount + i + 1}. ${_.isEqual(exp.creatorId._id, user._id) ? "📥 Sizdan" : "📤 Siz"}\n`;
      text += `💵 <b>${_.isEqual(exp.creatorId._id, user._id) ? "➕" : "➖"}${formatMoney(exp.currency, exp.amount)}</b>\n`;
      text += `📃 ${exp.description}\n`;
      text += `<i>🕧${moment(exp.createdAt).format("DD.MM.YYYY")}</i>\n\n`;
    });

    const inlineKeys = [[]];
    if (pageNumber > 0) inlineKeys[0].push({ text: "◀️", callback_data: `HISTORY ${partnerId} ${+pageNumber - 1}` });
    inlineKeys[0].push({ text: "❌", callback_data: `DELETE_MSG ${msgId}` });
    if ((+pageNumber + 1) * pageCount < total) inlineKeys[0].push({ text: "▶️", callback_data: `HISTORY ${partnerId} ${+pageNumber + 1}` });

    if (pageNumber === 0) await this.bot.answerCallbackQuery(query.id);
    this.sendMessage(user, text, { keys: inlineKeys, isInline: true, editMsgId: pageNumber === 0 ? undefined : msgId });
  };

  payExpense = async (user, query) => {
    const [name, partnerId] = query.data.split(" ");
    const msgId = query.message.message_id;

    if (partnerId === "ALL") {
      this.bot.deleteMessage(user.chatId, msgId);
      return this.enterPayExpenseAmount(user, "ALL");
    }

    await User.findByIdAndUpdate(user._id, { payExpenseTo: partnerId, botStep: botSteps.payExpenseAmount });
    const inlineKeys = [
      [
        { text: "❌ Bekor qilish", callback_data: "PAY_EXPENSE_CANCELED" },
        { text: "Hammasi", callback_data: "PAY_EXPENSE ALL" },
      ],
    ];
    this.sendMessage(user, "<b>To'lagan pul miqdoringizni kiriting:</b>\n\n<i>Agar hammasini to'lagan bo'lsangiz 'Hammasi' tugmasini bosing</i> ", { keys: inlineKeys, isInline: true, editMsgId: msgId });
  };
}

module.exports = QarzerBot;
