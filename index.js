const mongoose = require("mongoose");
const cors = require("cors");
const cachegoose = require("recachegoose");
const QarzerBot = require("./bot/qarzer");
const { mongo_url, tg_token } = require("./config");

cachegoose(mongoose, {
  engine: "memory",
});

mongoose
  .connect(mongo_url)
  .then(() => {
    console.log("CONNECTED TO DB");
    new QarzerBot(tg_token);
  })
  .catch((err) => {
    console.log(err);
  });
