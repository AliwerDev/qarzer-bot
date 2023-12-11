const mongoose = require("mongoose");
const QarzerBot = require("./bot/qarzer");

const mongoURI = "mongodb+srv://aliwerdev:1234@cluster0.qu6p9ff.mongodb.net/qarzer";
const TG_TOKEN = "6874089411:AAH_OK8QXoLMrOGmMfS-FSiAMeF8BMe82j8";

mongoose
  .connect(mongoURI)
  .then((result) => {
    console.log("CONNECTED TO DB");
    new QarzerBot(TG_TOKEN);
  })
  .catch((err) => {
    console.log(err);
  });
