const _ = require("lodash");
const TelegramBot = require("node-telegram-bot-api");

const User = require("../models/user");
const Group = require("../models/group");
const Expense = require("../models/expense");

const { mainKeys, keys, groupKeys, noCurrentGroupKeys, botSteps, onlyHomePageKey, expenseKeys } = require("./keys");
const { getFullName, reminderText, formatMoney } = require("../utils/functions");
const moment = require("moment");

class QarzerBot {
  chatId;
  user;

  constructor(TG_TOKEN) {
    this.bot = new TelegramBot(TG_TOKEN, { polling: true });
    this.bot.on("message", this.onMessage);
    this.bot.on("callback_query", this.onCallBackQuery);
  }

  // HANDLERS
  onMessage = async (msg) => {
    const chatId = (this.chatId = msg.chat.id);
    const message = msg.text;

    // USER CHECKING
    const user = await User.findOne({ chatId });
    if (!user) return this.createUser(msg);
    this.user = user;

    // CHECK BOT STEPS
    if (message === keys.homePage) return this.clickBack(user);
    if (user.botStep === botSteps.groupName) return this.enterGroupName(user, message);
    if (user.botStep === botSteps.groupCurrency) return this.enterGroupCurrency(user, message);
    if (user.botStep === botSteps.joinGroup) return this.joinGroup(user, message);
    // creating expens steps
    if (user.botStep === botSteps.expensDescription) return this.enterExpensDesc(user, message);
    if (user.botStep === botSteps.expensAmount) return this.enterExpensAmount(user, message);

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
      case keys.activeExpense:
        this.clickActiveExpenseList(user);
        break;
      case keys.createdByMe:
        this.clickCreatedByMe(user);
        break;
      case keys.paidExpense:
        this.clickPaidExpenses(user);
        break;
      case keys.clearAllExpenses:
        this.clickClearAllExpenses(user);
        break;
      case keys.group:
        this.clickGroupMenu(user);
        break;
      case keys.createGroup:
        this.clickCreateGroup(user);
        break;
      case keys.joinGroup:
        this.clickJoinGroup(user);
        break;
      case keys.currentGroup:
        this.clickCurrentGroup(user);
        break;
      case keys.myGroups:
        this.clickMyGroups(user);
        break;
      case keys.members:
        this.clickGroupMembers(user);
        break;
      case keys.clear:
        this.clickClear(msg);
        break;
      default:
        this.bot.deleteMessage(chatId, msg.message_id);
    }
  };
  onCallBackQuery = async (query) => {
    const chatId = query.from.id;
    const user = await User.findOne({ chatId });

    if (query.data.startsWith("CURRENT_GROUP")) return this.changeCurrentGroup(user, query);
    if (query.data.startsWith("CHOOSE_DEBTOR")) return this.chooseDebtors(user, query);
    if (query.data.startsWith("REMOVE_DEBTOR")) return this.chooseDebtors(user, query, true);
    if (query.data.startsWith("DISTRIBUTATION")) return this.chooseDistributionType(user, query);
    if (query.data.startsWith("CONFIRMATION")) return this.createExpense(user, query);
    if (query.data.startsWith("ACTIVE_EXPENSE")) return this.clickActiveExpenseList(user, query.data.slice(14), query.message.message_id);
    if (query.data.startsWith("MY_EXPENSE_PAGE")) return this.clickCreatedByMe(user, query.data.slice(15), query.message.message_id);
    if (query.data.startsWith("MY_EXPENSE")) return this.mySingleExpense(user, query);
    if (query.data.startsWith("REMINDER")) return this.reminderExpense(user, query);
    if (query.data.startsWith("PAID")) return this.changeToPaid(user, query);
    if (query.data.startsWith("RESET_ACCOUNT_PARTNER")) return this.choosedReasetAccountPartner(user, query);
    if (query.data.startsWith("RESET_ACCOUNT_ACCEPTED")) return this.resetAccountWithAccepted(user, query);
    if (query.data.startsWith("RESET_ACCOUNT_REJECTED")) return this.resetAccountWithRejected(user, query);
    if (query.data.startsWith("DELETE_MSG")) return this.bot.deleteMessage(this.chatId, query.message.message_id);
  };

  // MENU CLICK FUNCTIONS
  clickBotStart(user) {
    if (user.botStep) {
      user.botStep = "";
      user.save();
    }
    this.sendMessage("QARZER ga hush kelibsiz!");
  }

  clickBotMenu(user) {
    this.sendMessage("Menu ⬇️", { keys: mainKeys });
  }

  clickCreateExpens = async (user) => {
    const group = await Group.findById(user.currentGroupId);
    if (group.members?.length <= 1) {
      let alert = "Qarz yaratish uchun guruhda kamida 2 kishi bo'lishi kerak!\n\n";
      if (String(group.creatorId) === String(user._id)) alert += `Guruhga dostlaringizni taklif qilish uchun maxfiy raqam: <code>${group._id}</code>`;
      return this.sendMessage(alert);
    }

    this.sendMessage("💵 Pul miqdorini kiriting:", { keys: onlyHomePageKey });
    user.botStep = botSteps.expensAmount;
    user.save();
  };

  clickMyExpenses = async (user) => {
    const myExpenses = await Expense.find({ status: "active", $or: [{ creatorId: user._id }, { relatedTo: user._id }] }).populate("creatorId relatedTo", "firstName lastName chatId");

    if (!myExpenses.length) return this.sendMessage("💸 <b>Sizda faol qarzlar mavjud emas!</b>\n\n", { keys: expenseKeys });

    const expensesObject = {};
    myExpenses.forEach((exp) => {
      if (exp.creatorId.chatId === user.chatId) {
        if (expensesObject[exp.relatedTo.chatId]) expensesObject[exp.relatedTo.chatId].amount += exp.amount;
        else expensesObject[exp.relatedTo.chatId] = { amount: exp.amount, currency: exp.currency, name: getFullName(exp.relatedTo) };
      } else {
        if (expensesObject[exp.creatorId.chatId]) expensesObject[exp.creatorId.chatId].amount -= exp.amount;
        else expensesObject[exp.creatorId.chatId] = { amount: -exp.amount, currency: exp.currency, name: getFullName(exp.creatorId) };
      }
    });

    let text = "<b>Umumiy qarzlaringiz:</b> \n\n";
    for (const key in expensesObject) {
      text += `${expensesObject[key].name.trim()}:  ${expensesObject[key].amount > 0 ? "+" : ""}${formatMoney(expensesObject[key].currency, expensesObject[key].amount)}\n`;
    }
    text += "\n<i>➕ Sizdan qarz, ➖ Siz qarzsiz</i>";

    this.sendMessage(text, { keys: expenseKeys });
  };

  clickActiveExpenseList = async (user, pageNumber = 0, msgId) => {
    const pageCount = 5;
    const expenses = await Expense.find({ status: "active", relatedTo: user._id })
      .limit(pageCount)
      .skip(pageNumber * pageCount)
      .populate("creatorId", "firstName lastName chatId");

    if (pageNumber === 0 && !expenses.length) return this.sendMessage("💸<b>Siz to'lashingiz kerak bo'lgan qarzlar hali mavjud emas!</b>\n\n", { keys: expenseKeys });

    let text = "💸<b>Siz to'lashingiz kerak bo'lgan qarzlar: </b>\n\n";
    expenses.forEach((exp, i) => {
      text += `${pageNumber * pageCount + i + 1}. <b>${formatMoney(exp.currency, exp.amount)}</b>\n`;
      text += `Kimga: <a href="tg://user?id=${exp.creatorId.chatId}">${getFullName(exp.creatorId)}</a>\n`;
      text += `Sharx: ${exp.description}\n`;
      text += `<i> 🕧${moment(exp.createdAt).format("DD.MM.YYYY HH:mm")}</i>\n\n`;
    });

    const inlineKeys = [[]];
    if (pageNumber > 0) inlineKeys[0].push({ text: "◀️", callback_data: `ACTIVE_EXPENSE ${+pageNumber - 1}` });
    if (expenses.length > 0 && expenses.length === pageCount) inlineKeys[0].push({ text: "▶️", callback_data: `ACTIVE_EXPENSE ${+pageNumber + 1}` });

    // if (msgId) this.bot.deleteMessage(this.chatId, msgId);
    this.sendMessage(text, { keys: inlineKeys, isInline: true, editMsgId: msgId });
  };

  clickCreatedByMe = async (user, pageNumber = 0, msgId) => {
    const pageCount = 6;
    const expenses = await Expense.find({ status: "active", creatorId: user._id })
      .limit(pageCount)
      .skip(pageNumber * pageCount)
      .populate("relatedTo", "firstName lastName chatId");

    if (pageNumber === 0 && !expenses.length) return this.sendMessage("💸<b>Sizga to'lanilishi kerak bo'lgan qarzlar hali mavjud emas!</b>\n\n", { keys: expenseKeys });

    let text = "💸<b>Sizga to'lanilishi kerak bo'lgan qarzlar: </b>\n\n";
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

    // if (msgId) this.bot.deleteMessage(this.chatId, msgId);
    this.sendMessage(text, { keys: inlineKeys, isInline: true, editMsgId: msgId });
  };

  clickPaidExpenses = async (user, pageNumber = 0, msgId) => {
    const pageCount = 5;
    const expenses = await Expense.find({ status: "paid", $or: [{ relatedTo: user._id }, { creatorId: user._id }] })
      .limit(pageCount)
      .skip(pageNumber * pageCount)
      .populate("creatorId relatedTo", "firstName lastName chatId");

    let text = "💸<b>Siz to'lagan va sizga to'langan qarzlar royxati: </b>\n\n";
    if (pageNumber === 0 && !expenses.length) return this.sendMessage("💸<b>Siz to'lagan va sizga to'langan qarzlar hali mavjud emas!</b>\n\n", { keys: expenseKeys });

    expenses.forEach((exp, i) => {
      const isCreatorMe = exp.creatorId.chatId === user.chatId;

      text += `${pageNumber * pageCount + i + 1}. ${isCreatorMe ? "📥" : "📤"}<b>${formatMoney(exp.currency, exp.amount)}</b>\n`;
      text += ` Kim to'ladi: <a href="tg://user?id=${exp.relatedTo.chatId}">${isCreatorMe ? getFullName(exp.relatedTo) : "Siz"}</a>\n`;
      text += ` Kimga to'landi: <a href="tg://user?id=${exp.creatorId.chatId}">${isCreatorMe ? "Sizga" : getFullName(exp.creatorId)}</a>\n`;
      text += ` Sharx: ${exp.description}\n`;
      text += ` <i> 🕧${moment(exp.createdAt).format("DD.MM.YYYY HH:mm")}</i>\n\n`;
    });

    this.sendMessage(text, { keys: expenseKeys, editMsgId: msgId });
  };

  clickClearAllExpenses = async (user) => {
    const group = await Group.findById(user.currentGroupId).populate("members");
    const inlineKeys = group.members.filter((_) => String(_._id) != String(user._id)).map((member) => [{ text: getFullName(member), callback_data: "RESET_ACCOUNT_PARTNER " + String(member._id) }]);
    this.sendMessage("Kim bilan o'rtangizdagi qarzlarni no'llashtirmoqchisiz?", { keys: inlineKeys, isInline: true });
  };

  clickGroupMenu(user) {
    user.save().then(() => this.sendMessage("Guruh sozlamalari⬇️", { keys: groupKeys }));
  }

  clickCreateGroup(user) {
    this.sendMessage("Guruh nomini kiriting:", { keys: onlyHomePageKey });
    user.botStep = botSteps.groupName;
    user.save();
  }

  clickJoinGroup(user) {
    this.sendMessage("🗝 Guruh maxfiy raqamini kiriting:", { keys: onlyHomePageKey });
    user.botStep = botSteps.joinGroup;
    user.save();
  }

  clickCurrentGroup(user) {
    Group.find({ members: user._id })
      .then((groups) => {
        const currentGroup = groups.find((g) => String(g._id) === String(user.currentGroupId));

        let listMessage = `<b>Joriy Guruhingiz: <code>${currentGroup.name}</code></b> \n\n`;
        if (String(currentGroup.creatorId) === String(user._id)) listMessage += `<b>Gruh maxfiy raqami: <code>${currentGroup._id}</code></b> \n\n`;

        if (groups.length > 1) listMessage += "Almashtirish uchun quidagi guruhlaringizdan birini tanlang:";

        const inlineKeys = groups.filter((g) => String(g._id) !== String(user.currentGroupId)).map((group) => [{ text: group.name, callback_data: "CURRENT_GROUP " + String(group._id) }]);

        this.sendMessage(listMessage, { keys: inlineKeys, isInline: true });
      })
      .catch((err) => console.log(err));
  }

  clickMyGroups(user) {
    Group.find({ creatorId: user._id }).then((groups) => {
      if (_.isEmpty(groups)) return this.sendMessage("<b>Hali sizda guruhlar mavjud emas!</b>", { keys: groupKeys });

      let listMessage = "<b>Your Groups:</b> \n\n";

      groups.forEach((group, index) => {
        listMessage += `${index + 1}. ${group.name}\n Pul birligi: ${group.currency}\n Maxfiy raqam: <code>${group._id}</code> \n\n`;
      });

      this.sendMessage(listMessage, { keys: groupKeys });
    });
  }

  clickGroupMembers(user) {
    Group.findById(user.currentGroupId)
      .populate("members")
      .then((group) => {
        let listMessage = `👥<b><code>${group.name}</code> - azolari:</b> \n`;
        const creator = group.members?.find((user) => String(user._id) === String(group.creatorId));
        listMessage += `<i>Guruh yaratuvchisi:</i> ${getFullName(creator)}\n\n`;

        group.members?.forEach((user, index) => {
          listMessage += `${index + 1}. ${getFullName(user)} <a href="tg://user?id=${user.chatId}">${user.userName || user.chatId}</a>\n`;
        });
        this.sendMessage(listMessage, { keys: groupKeys });
      });
  }

  clickBack(user) {
    if (user.incomplatedExpense.amount) user.incomplatedExpense = { debtors: [] };
    if (user.incomplatedGroupName) user.incomplatedGroupName = "";

    user.botStep = "";
    user.save().then(() => this.sendMessage("🏠 Asosiy bo'lim!"));
  }

  clickClear(msg) {
    for (let i = 0; i < 101; i++) {
      this.bot.deleteMessage(msg.chat.id, msg.message_id - i).catch((er) => {
        return;
      });
    }
  }

  // BOT FUNCTIONS
  createUser(msg) {
    const userdata = { firstName: msg.from.first_name, lastName: msg.from.last_name, userName: msg.from.username, chatId: this.chatId };
    const user = new User(userdata);
    user.save();
  }

  messageOptions(keys, isInline = false, withoutKey = false) {
    const opts = {
      parse_mode: "HTML",
      reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };
    if (withoutKey) return opts;

    if (!isInline) opts.reply_markup.keyboard = keys;
    else opts.reply_markup.inline_keyboard = keys;

    return opts;
  }

  enterExpensAmount = async (user, amount) => {
    if (!_.isNumber(+amount) || _.isNaN(+amount) || amount <= 0) return this.sendMessage("Pul miqdori xato kiritilgan, iltimos qaytadan kiriting❗️", { keys: onlyHomePageKey });
    const group = await Group.findById(user.currentGroupId);

    user.incomplatedExpense.amount = amount;
    user.incomplatedExpense.currency = group.currency;
    user.botStep = botSteps.expensDescription;
    user.save().then(() => this.sendMessage("📄 Qarz sharxini kiriting:", { keys: onlyHomePageKey }));
  };

  enterExpensDesc(user, desc) {
    this.displayChooseDeptors(user);
    user.incomplatedExpense.description = desc;
    user.botStep = botSteps.chooseDebtors;
    user.save();
  }

  displayChooseDeptors(user, choosedIds, msgId) {
    Group.findById(user.currentGroupId)
      .populate("members")
      .then(({ members }) => {
        let inlineKeys;

        if (choosedIds?.find((id) => id === "ALL")) {
          inlineKeys = [[{ text: `ALL ☑️`, callback_data: "REMOVE_DEBTOR ALL" }]];
        } else {
          inlineKeys = members
            .filter((m) => String(m._id) !== String(user._id))
            .map((member) => {
              let isChoosed = choosedIds?.find((id) => String(member._id) === id);

              return [{ text: `${getFullName(member)} ${isChoosed ? "☑️" : ""}`, callback_data: (isChoosed ? "REMOVE_DEBTOR " : "CHOOSE_DEBTOR ") + String(member._id) }];
            });
          if (!choosedIds?.length) inlineKeys.unshift([{ text: `ALL`, callback_data: "CHOOSE_DEBTOR ALL" }]);
        }

        if (choosedIds?.length) {
          inlineKeys.push([{ text: "Davom ettirish ➡️", callback_data: "CHOOSE_DEBTOR DONE" }]);
        }

        if (msgId) {
          this.bot.deleteMessage(user.chatId, msgId);
        }
        this.sendMessage("Qarzdorlarni tanlang:", { keys: inlineKeys, isInline: true });
      });
  }

  enterGroupName(user, message) {
    user.incomplatedGroupName = message;
    user.botStep = botSteps.groupCurrency;
    user.save().then((g) => {
      this.sendMessage(`Guruh uchun pul birligini kiriting: \n<code>MU: UZS, USD, ...</code>`, { keys: onlyHomePageKey });
    });
  }

  enterGroupCurrency(user, message) {
    if (_.isNumber(message) || message.length > 4) return this.sendMessage(`Pul birligi harf yoki belgilardan iborat va uzunligi 4 belgidan oshmasligi kerak! iltimos qaytadan kiriting:`, { keys: onlyHomePageKey });
    const group = new Group({ name: user.incomplatedGroupName, currency: message, creatorId: user._id, members: [user._id] });

    group
      .save()
      .then((g) => {
        user.currentGroupId = g._id;
        user.botStep = "";
        user.save();
        this.sendMessage(`<code>"${g.name}"</code> - guruh muvaffaqqiyatli yaratildi va joriy guruhingiz qilib belgilandi!`);
      })
      .catch((err) => console.log(err));
  }

  joinGroup(user, message) {
    Group.findOneAndUpdate({ _id: message }, { $addToSet: { members: user._id } })
      .then((group) => {
        if (group.members?.find((memberId) => String(memberId) === String(user._id))) {
          return this.sendMessage("Siz bu guruhda avvaldan mavjudsiz, iltimos qaytadan kiriting:", { keys: onlyHomePageKey });
        }
        user.botStep = "";
        user.currentGroupId = message;
        user.save().then(() => this.sendMessage(`Tabriklaymiz siz <code>${group.name}</code> guruhiga muvaffaqqiyatli qo'shildingiz!`));
      })
      .catch((err) => {
        user.botStep = "";
        user.save();
        this.sendMessage("Bunday guruh topilmadi!");
      });
  }

  sendMessage(message, { keys = mainKeys, isInline = false, chatId = this.chatId, withoutKey, editMsgId = null } = {}) {
    if (!this.user?.currentGroupId && keys !== onlyHomePageKey) keys = noCurrentGroupKeys;
    const options = this.messageOptions(keys, isInline, withoutKey);

    if (editMsgId) this.bot.editMessageText(message, { chat_id: chatId, message_id: editMsgId, ...options });
    else this.bot.sendMessage(chatId, message, options);
  }

  // CALLBACK QUEARY FUNCTIONS
  changeCurrentGroup = (user, query) => {
    // CURRENT_GROUP
    const groupId = query.data.slice(14);
    user.currentGroupId = groupId;

    user.save().then(() => {
      this.bot.deleteMessage(query.from.id, query.message.message_id).then(() => this.sendMessage(`Joriy guruhingiz muvaffaqqiyatli o'zgartirildi!`));
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
      this.bot.deleteMessage(this.chatId, msgId);

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

      this.sendMessage(text, { keys: inlineKeys, isInline: true });
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
      const group = await Group.findById(user.currentGroupId);
      debtorsCount = group.members.length - 1;
      user.incomplatedExpense.debtors = group.members.filter((item) => String(item) !== String(user._id));
    } else debtorsCount = user.incomplatedExpense.debtors?.length;

    let amountForOneDebtor = type === "1" ? amount : type === "2" ? amount / debtorsCount : amount / (debtorsCount + 1);
    amountForOneDebtor = _.round(amountForOneDebtor, 2);

    user.incomplatedExpense.amountForOneDebtor = amountForOneDebtor;
    user.save();

    this.bot.deleteMessage(this.chatId, msgId);

    let text = "<b>Qarz: </b> \n\n";
    text += `Sharx:  <code>${user.incomplatedExpense.description}</code> \n`;
    text += `Umumiy qiymati:  <code>${formatMoney(user.incomplatedExpense.currency, amountForOneDebtor * debtorsCount)}</code> \n`;
    text += `Qarzdorlar soni:  <code>${debtorsCount}</code> \n`;
    text += `Har bir kishiga tog'ri keluvchi summa: <code>${formatMoney(user.incomplatedExpense.currency, amountForOneDebtor)}</code> \n\n`;
    text += `Hammasi tog'riligini tasdiqlang:`;
    const inlineKeys = [[{ text: "✅ TASDIQLASH", callback_data: "CONFIRMATION" }]];

    this.sendMessage(text, { keys: inlineKeys, isInline: true });
  };
  createExpense = async (user, query) => {
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

    this.bot.answerCallbackQuery(query.id);
    Expense.create(expenses).then((exp) => {
      this.sendMessage("Qarzlar muvaffaqqiyatli yaratildi!");
      const expIds = exp.map((item) => item._id);

      Expense.find({ _id: expIds })
        .populate("relatedTo", "chatId")
        .then((newExps) => {
          newExps.map((item) => {
            const expensText = `📨 Sizga yangi qarz biriktirildi:\n\n💆‍♂️Kimdan: <a href="tg://user?id=${user.chatId}">${getFullName(user)}</a>\n💵Qarz miqdori: <code>${formatMoney(item.currency, item.amount)}</code>\n📃Sharx: <code>${
              item.description
            }</code>`;
            this.sendMessage(expensText, { chatId: item.relatedTo.chatId });
          });
        });
    });
  };
  mySingleExpense = async (user, query) => {
    // MY_EXPENSE
    const expensId = query.data.slice(11);
    const msgId = query.message.message_id;
    const expense = await Expense.findById(expensId).populate("relatedTo");

    let text = `<b>Qarz: ${formatMoney(expense.currency, expense.amount)}</b>\n`;
    text += `Qarzdor: <a href="tg://user?id=${expense.relatedTo.chatId}">${getFullName(expense.relatedTo)}</a>\n`;
    text += `Sharx: ${expense.description}\n`;
    text += `<i>🕧 ${moment(expense.createdAt).format("DD.MM.YYYY HH:mm")}</i>\n\n`;

    const inlineKeys = [
      [
        { text: "🔔 Eslatish", callback_data: `REMINDER ${expensId}` },
        { text: "✅ To'landi", callback_data: `PAID ${expensId}` },
      ],
      [{ text: "❌", callback_data: `DELETE_MSG ${msgId}` }],
    ];
    this.bot.answerCallbackQuery(query.id).then(() => this.sendMessage(text, { keys: inlineKeys, isInline: true }));
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

    this.sendMessage(text, { chatId: expense.relatedTo.chatId });
    this.bot.answerCallbackQuery(query.id).then(() => this.sendMessage(`Qarzdorga ushbu eslatmangiz yuborildi: \n <pre>${message}</pre>`, { keys: expenseKeys, chatId: user.chatId }));
  };
  changeToPaid = async (user, query) => {
    const msgId = query.message.message_id;

    const expensId = query.data.slice(5);
    await Expense.findByIdAndUpdate(expensId, { status: "paid" });
    this.bot.deleteMessage(user.chatId, msgId).then(() => this.sendMessage(`Qarz "To'langan qarzlar" bo'limiga muvaffaqqiyatli o'tkazildi!`, { keys: expenseKeys }));
  };

  choosedReasetAccountPartner = (user, query) => {
    const partnerId = query.data.replace("RESET_ACCOUNT_PARTNER ", "");

    User.findById(partnerId)
      .then((partner) => {
        const inlineKeys = [
          [
            { text: "❌ Bekor qilish", callback_data: `RESET_ACCOUNT_REJECTED ${user._id}` },
            { text: "✅ Tasdiqlash", callback_data: `RESET_ACCOUNT_ACCEPTED ${user._id}` },
          ],
        ];
        const msgForPartner = `<a href="tg://user?id=${user.chatId}">${getFullName(user)}</a> o'rtangizdagi qarzlarni no'llashtirmoqchi, \n\n<b>o'rtangizda qarzlar qolmaganligini tasdiqlaysizmi?</b>`;
        const msg = `<b>⏳Sizning so'rovingiz <a href="tg://user?id=${user.chatId}">${getFullName(user)}</a> ga yuborildi.</b>\n\n<i>So'rovungiz tasdiqlangandan so'ng o'rtangizdagi qarzlar o'chiriladi!</i>`;

        this.sendMessage(msgForPartner, { keys: inlineKeys, isInline: true, chatId: partner.chatId });
        this.bot.answerCallbackQuery(query.id).then(() => this.sendMessage(msg));
      })
      .catch(() => {});
  };

  resetAccountWithRejected = (user, query) => {
    const partnerId = query.data.replace("RESET_ACCOUNT_REJECTED ", "");
    const msgId = query.message.message_id;

    User.findById(partnerId)
      .then((partner) => {
        this.bot.deleteMessage(user.chatId, msgId);
        const msg = `🔴 <a href="tg://user?id=${user.chatId}">${getFullName(user)}</a> qarzlarni no'llashtirish so'rovingizni rad etdi!`;
        this.sendMessage(msg, { chatId: partner.chatId, withoutKey: true });
      })
      .catch(() => {});
  };

  resetAccountWithAccepted = async (user, query) => {
    const partnerId = query.data.replace("RESET_ACCOUNT_ACCEPTED ", "");
    const msgId = query.message.message_id;

    User.findById(partnerId)
      .then((partner) => {
        Expense.updateMany({ status: "active", $and: [{ $or: [{ creatorId: user._id }, { creatorId: partnerId }] }, { $or: [{ relatedTo: user._id }, { relatedTo: partnerId }] }] }, { status: "paid" }).then(() => {
          const msgToPartner = `🟢 <a href="tg://user?id=${user.chatId}">${getFullName(user)}</a> qarzlarni no'llashtirish so'rovingizni qabul qildi va o'rtangizdagi qarzlar o'chirildi!`;
          const msg = `🟢 <a href="tg://user?id=${partner.chatId}">${getFullName(partner)}</a> bilan o'rtangizdagi qarzlar muvaffaqiyatli o'chirildi!`;

          this.bot.deleteMessage(user.chatId, msgId);
          this.sendMessage(msgToPartner, { chatId: partner.chatId, withoutKey: true });
          this.sendMessage(msg, { chatId: user.chatId, withoutKey: true });
        });
      })
      .catch(() => {});
  };
}

module.exports = QarzerBot;
