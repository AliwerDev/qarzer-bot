const TelegramBot = require("node-telegram-bot-api");
const { mainKeys, keys, groupKeys, noCurrentGroupKeys } = require("./inline-keys");
const User = require("../models/user");
const Group = require("../models/group");
const { default: mongoose } = require("mongoose");

const tgToken = "6874089411:AAH_OK8QXoLMrOGmMfS-FSiAMeF8BMe82j8";

function runTelegramgBot() {
  const bot = new TelegramBot(tgToken, { polling: true });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const msgId = msg.message_id;
    const message = msg.text;

    const opts = {
      parse_mode: "HTML",
      reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: mainKeys,
      },
    };

    // ChECKING USER
    const user = await User.findOne({ chatId });
    if (!user) {
      const userdata = { firstName: msg.from.first_name, lastName: msg.from.last_name, userName: msg.from.username, chatId };
      const user = new User(userdata);
      user.save();
      return;
    } else if (!user.currentGroupId) opts.reply_markup.keyboard = noCurrentGroupKeys;
    else if (user.page === keys.group) opts.reply_markup.keyboard = groupKeys;

    // START
    if (message === "/start") {
      bot.sendMessage(chatId, "QARZER ga hush kelibsiz!", opts);
      return;
    }

    // GROUP MENUS
    if (message === keys.group) {
      opts.reply_markup.keyboard = groupKeys;
      bot.deleteMessage(chatId, msgId);
      bot.sendMessage(chatId, "Guruh ⬇️", opts);

      user.page = keys.group;
      user.save();
      return;
    }

    // CREATE GROUP
    if (message === keys.createGroup) {
      bot.sendMessage(chatId, "Enter group name:", opts);
      user.botStep = keys.createGroup;
      user.save();
      return;
    }
    if (user.botStep === keys.createGroup) {
      opts.reply_markup.keyboard = groupKeys;
      const group = new Group({ name: message, creatorId: user._id, members: [user._id] });
      group.save();
      bot.sendMessage(chatId, `"${message}" - guruh muvaffaqqiyatli yaratildi`, opts);

      user.botStep = keys.group;
      user.save();
      return;
    }

    // JOIN A GROUP
    if (message === keys.joinGroup) {
      bot.sendMessage(chatId, "Guruh maxfiy raqamini kiriting:", opts);
      user.botStep = keys.joinGroup;
      user.save();
      return;
    }
    if (user.botStep === keys.joinGroup) {
      if (!mongoose.isValidObjectId(message)) return bot.sendMessage(chatId, "Raqam formatida xatolik bor, Iltimos qaytadan kiriting:", opts);

      Group.findOneAndUpdate({ _id: message }, { $addToSet: { members: user._id } })
        .then((group) => {
          if (group.members?.find((memberId) => memberId === user._id)) {
            bot.sendMessage(chatId, "Siz bu guruhda avvaldan mavjudsiz", opts);
          }
          opts.reply_markup.keyboard = mainKeys;
          bot.sendMessage(chatId, `Tabriklaymiz siz <code>${group.name}</code> guruhiga muvaffaqqiyatli qo'shildingiz!`, opts);

          user.botStep = "";
          user.page = "";
          user.currentGroupId = message;
          user.save();
        })
        .catch((err) => {
          console.log(err);
          bot.sendMessage(chatId, "Afsuski bunday guruh topilmadi, Iltimos qaytadan kiriting:", opts);
        });

      return;
    }

    // CURRENT GROUP
    if (message === keys.currentGroup) {
      Group.find({ members: user._id })
        .then((groups) => {
          const currentGroup = groups.find((g) => String(g._id) === String(user.currentGroupId));

          let listMessage = `<b>Joriy Guruhingiz: <code>${currentGroup.name}</code></b> \n\n`;
          if (groups.length > 1) listMessage += "Almashtirish uchun quidagi guruhlaringizdan birini tanlang:";

          const inlineKeys = groups.filter((g) => String(g._id) !== String(user.currentGroupId)).map((group) => [{ text: group.name, callback_data: "CURRENT_GROUP " + String(group._id) }]);
          console.log(inlineKeys);
          opts.reply_markup.keyboard = undefined;
          opts.reply_markup.inline_keyboard = inlineKeys;
          bot.sendMessage(chatId, listMessage, opts);
        })
        .catch((err) => {
          console.log(err);
          // bot.sendMessage(chatId, "Afsuski bunday guruh topilmadi, Iltimos qaytadan kiriting:", opts);
        });
      // bot.sendMessage(chatId, "Guruh maxfiy raqamini kiriting:", opts);
      // user.botStep = keys.joinGroup;
      // user.save();
      // return;
    }
    if (user.botStep === keys.currentGroup) {
      // if (!mongoose.isValidObjectId(message)) return bot.sendMessage(chatId, "Raqam formatida xatolik bor, Iltimos qaytadan kiriting:", opts);

      Group.findOneAndUpdate({ _id: message }, { $addToSet: { members: user._id } })
        .then((group) => {
          opts.reply_markup.keyboard = mainKeys;
          bot.sendMessage(chatId, `Tabriklaymiz siz <code>${group.name}</code> guruhiga muvaffaqqiyatli qo'shildingiz!`, opts);

          user.botStep = "";
          user.page = "";
          user.currentGroupId = message;
          user.save();
        })
        .catch((err) => {
          console.log(err);
          bot.sendMessage(chatId, "Afsuski bunday guruh topilmadi, Iltimos qaytadan kiriting:", opts);
        });

      return;
    }

    // MY GROUPS
    if (message === keys.myGroups) {
      Group.find({ creatorId: user._id }).then((groups) => {
        let listMessage = "<b>Your Groups:</b> \n\n";

        groups.forEach((group, index) => {
          listMessage += `${index + 1}. ${group.name} (<code>${group._id}</code>) \n`;
        });

        bot.sendMessage(chatId, listMessage, opts);
      });
      return;
    }

    // BACK
    if (message === keys.back) {
      opts.reply_markup.keyboard = mainKeys;
      bot.sendMessage(chatId, "Main page!", opts);
      user.page = "";
      user.save();
      return;
    }

    if (message === "clear") {
      for (let i = 0; i < 101; i++) {
        bot.deleteMessage(msg.chat.id, msg.message_id - i).catch((er) => {
          return;
        });
      }
      return;
    }

    bot.deleteMessage(chatId, msgId);
    // bot.sendMessage(chatId, `Your text ${message} ` + chatId);
  });

  bot.on("callback_query", (query) => {
    const chatId = query.chat.id;
    if (query.data.startsWith("CURRENT_GROUP")) {
    }
  });
}

module.exports = runTelegramgBot;
