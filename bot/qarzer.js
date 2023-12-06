const mongoose = require("mongoose");
const _ = require("lodash");

const User = require("../models/user");
const Group = require("../models/group");
const Expense = require("../models/expense");

const { mainKeys, keys, groupKeys, noCurrentGroupKeys, botSteps, onlyHomePageKey } = require("./keys");

class QarzerBot {
  chatId;

  constructor(bot) {
    this.bot = bot;
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

    // CHECK BOT STEPS
    if (message === keys.homePage) return this.clickBack(user);
    if (user.botStep === botSteps.createGroup) return this.createGroup(user, message);
    if (user.botStep === botSteps.joinGroup) return this.joinGroup(user, message);
    // creating expens steps
    if (user.botStep === botSteps.expensDescription) return this.enterExpensDesc(user, message);
    if (user.botStep === botSteps.expensAmount) return this.enterExpensAmount(user, message);

    // CHECKING MESSAGE
    switch (message) {
      case keys.start:
        this.clickBotStart(user);
        break;
      case keys.createExpens:
        this.clickCreateExpens(user);
        break;
      case keys.myExpenses:
        this.clickMyExpenses(user);
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
  };

  // MENU CLICK FUNCTIONS
  clickBotStart(user) {
    if (user.botStep) {
      user.botStep = "";
      user.save();
    }
    this.sendMessage("QARZER ga hush kelibsiz!", user.currentGroupId ? mainKeys : noCurrentGroupKeys);
  }

  clickCreateExpens(user) {
    this.sendMessage("Pul miqdorini kiriting:", onlyHomePageKey);
    user.botStep = botSteps.expensAmount;
    user.save();
  }

  clickMyExpenses(user) {}

  clickGroupMenu(user) {
    user.save().then(() => this.sendMessage("Guruh sozlamalari⬇️", groupKeys));
  }

  clickCreateGroup(user) {
    this.sendMessage("Guruh nomini kiriting:", false);
    user.botStep = botSteps.createGroup;
    user.save();
  }

  clickJoinGroup(user) {
    this.sendMessage("Guruh maxfiy raqamini kiriting:", false);
    user.botStep = botSteps.joinGroup;
    user.save();
  }

  clickCurrentGroup(user) {
    Group.find({ members: user._id })
      .then((groups) => {
        const currentGroup = groups.find((g) => String(g._id) === String(user.currentGroupId));

        let listMessage = `<b>Joriy Guruhingiz: <code>${currentGroup.name}</code></b> \n\n`;
        if (groups.length > 1) listMessage += "Almashtirish uchun quidagi guruhlaringizdan birini tanlang:";

        const inlineKeys = groups.filter((g) => String(g._id) !== String(user.currentGroupId)).map((group) => [{ text: group.name, callback_data: "CURRENT_GROUP " + String(group._id) }]);

        this.sendMessage(listMessage, inlineKeys, true);
      })
      .catch((err) => console.log(err));
  }

  clickMyGroups(user) {
    Group.find({ creatorId: user._id }).then((groups) => {
      let listMessage = "<b>Your Groups:</b> \n\n";
      groups.forEach((group, index) => {
        listMessage += `${index + 1}. ${group.name} (<code>${group._id}</code>) \n`;
      });

      this.sendMessage(listMessage);
    });
  }

  clickGroupMembers(user) {
    Group.findById(user.currentGroupId)
      .populate("members")
      .then((group) => {
        let listMessage = `<b><code>${group.name}</code> - guruh azolari:</b> \n\n`;
        group.members?.forEach((user, index) => {
          listMessage += `${index + 1}. ${user.firstName || ""} ${user.lastName || ""} <a href="tg://user?id=${user.chatId}">${user.userName}</a>\n`;
        });
        this.sendMessage(listMessage);
      });
  }

  clickBack(user) {
    if (user.incomplatedExpense.amount) user.incomplatedExpense = {};

    user.botStep = "";
    user.save().then(() => this.sendMessage("Main page!"));
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

  messageOptions(keys, isInline = false) {
    const opts = {
      parse_mode: "HTML",
      reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };
    if (keys === false) return opts;

    if (!isInline) opts.reply_markup.keyboard = keys;
    else opts.reply_markup.inline_keyboard = keys;

    return opts;
  }

  enterExpensAmount(user, amount) {
    if (!_.isNumber(+amount) || _.isNaN(+amount)) return this.sendMessage("Pul miqdori hato kiritilgan, iltimos qaytadan kiriting!", onlyHomePageKey);
    user.incomplatedExpense.amount = amount;
    user.botStep = botSteps.expensDescription;
    user.save().then(() => this.sendMessage("Qarz sharxini kiriting:", onlyHomePageKey));
  }

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

              return [{ text: `${member.firstName || ""} ${member.lastName || ""} ${isChoosed ? "☑️" : ""}`, callback_data: (isChoosed ? "REMOVE_DEBTOR " : "CHOOSE_DEBTOR ") + String(member._id) }];
            });
          inlineKeys.unshift([{ text: `ALL`, callback_data: "CHOOSE_DEBTOR ALL" }]);
        }

        if (choosedIds?.length) {
          inlineKeys.push([{ text: "Davom ettirish ➡️", callback_data: "CHOOSE_DEBTOR DONE" }]);
        }

        if (msgId) {
          this.bot.deleteMessage(user.chatId, msgId);
        }
        this.sendMessage("Qarzdorlarni tanlang:", inlineKeys, true);
      });
  }

  createGroup(user, message) {
    const group = new Group({ name: message, creatorId: user._id, members: [user._id] });

    group
      .save()
      .then((g) => {
        user.currentGroupId = g._id;
        user.botStep = "";
        user.save();
        this.sendMessage(`"${message}" - guruh muvaffaqqiyatli yaratildi`);
      })
      .catch((err) => console.log(err));
  }

  joinGroup(user, message) {
    Group.findOneAndUpdate({ _id: message }, { $addToSet: { members: user._id } })
      .then((group) => {
        if (group.members?.find((memberId) => memberId === user._id)) {
          this.sendMessage("Siz bu guruhda avvaldan mavjudsiz!", false);
        }
        this.sendMessage(`Tabriklaymiz siz <code>${group.name}</code> guruhiga muvaffaqqiyatli qo'shildingiz!`);
        user.botStep = "";
        user.currentGroupId = message;
        user.save();
      })
      .catch((err) => {
        user.botStep = "";
        user.save();
        this.sendMessage("Bunday guruh topilmadi!");
      });
  }

  sendMessage(message, keys = mainKeys, isInline = false) {
    const options = this.messageOptions(keys, isInline);
    this.bot.sendMessage(this.chatId, message, options);
  }

  // CALLBACK QUEARY FUNCTIONS
  changeCurrentGroup(user, query) {
    // CURRENT_GROUP
    const groupId = query.data.slice(14);
    user.currentGroupId = groupId;

    user.save().then(() => {
      this.bot.deleteMessage(query.from.id, query.message.message_id);
      this.sendMessage(`Joriy guruhingiz muvaffaqqiyatli o'zgartirildi!`);
    });
  }
  chooseDebtors = async (user, query, isBeforeChoosed) => {
    // CHOOSE_DEBTOR
    // REMOVE_DEBTOR
    const debtorId = query.data.slice(14);
    const msgId = query.message.message_id;

    if (debtorId === "DONE") {
      user.botStep = botSteps.distributionType;
      user.save();

      this.bot.deleteMessage(this.chatId, msgId);

      let text = "Kiritilgan pull miqdori qanday taqsimlansin: \n\n";
      text += `1. Tanlanganlarga ${user.incomplatedExpense.amount} dan qarz yozilsin. \n`;
      text += `2. Tanlanganlarga ${user.incomplatedExpense.amount} teng bo'linib qarz yozilsin. \n`;
      text += `3. Tanlanganlarga va o'zimga ${user.incomplatedExpense.amount} teng bo'linib qarz yozilsin.\n`;

      const inlineKeys = [
        [
          { text: "1️⃣", callback_data: "DISTRIBUTATION 1️" },
          { text: "2️⃣", callback_data: "DISTRIBUTATION 2" },
          { text: "3️⃣", callback_data: "DISTRIBUTATION 3" },
        ],
      ];

      this.sendMessage(text, inlineKeys, true);
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
    text += `Umumiy qiymati:  <code>${amountForOneDebtor * debtorsCount}</code> \n`;
    text += `Qarzdorlar soni:  <code>${debtorsCount}</code> \n`;
    text += `Har bir kishiga tog'ri keluvchi summa: <code>${amountForOneDebtor}</code> \n\n`;
    text += `Hammasi tog'riligini tasdiqlang:`;
    const inlineKeys = [[{ text: "✅ TASDIQLASH", callback_data: "CONFIRMATION" }]];

    this.sendMessage(text, inlineKeys, true);
  };
  createExpense = async (user, query) => {
    const expenses = user.incomplatedExpense.debtors?.map((debtorId) => ({
      amount: user.incomplatedExpense.amount,
      groupId: user.currentGroupId,
      creatorId: user._id,
      description: user.incomplatedExpense.description,
      relatedTo: debtorId,
    }));
    user.incomplatedExpense = { debtors: [] };
    user.save();

    this.bot.answerCallbackQuery(query.id);
    Expense.create(expenses).then(() => this.sendMessage("Qarzlar muvaffaqqiyatli yaratildi!"));
  };
}

module.exports = QarzerBot;
