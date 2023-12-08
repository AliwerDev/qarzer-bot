const mongoose = require("mongoose");
const QarzerBot = require("./bot/qarzer");
const TelegramBot = require("node-telegram-bot-api");

const mongoURI = "mongodb+srv://aliwerdev:1234@cluster0.qu6p9ff.mongodb.net/qarzer";
const tgToken = "6874089411:AAH_OK8QXoLMrOGmMfS-FSiAMeF8BMe82j8";
const IP = require("ip");

const bot = new TelegramBot(tgToken, { polling: true });

const express = require("express");
const app = express();
const port = 3000;

app.listen(8080, () => {
  const ipAddress = IP.address();
  console.log(ipAddress, " address");

  console.log(`Server is running at http://localhost:${port}`);
});

mongoose
  .connect(mongoURI)
  .then((result) => {
    console.log("CONNECTED TO DB");
    new QarzerBot(bot);
  })
  .catch((err) => {
    console.log(err);
  });
