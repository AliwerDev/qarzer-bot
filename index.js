const mongoose = require("mongoose");
const QarzerBot = require("./bot/qarzer");
var cachegoose = require("recachegoose");

cachegoose(mongoose, {
  engine: "memory",
});

const mongoURI = "mongodb+srv://aliwerdev:1234@cluster0.qu6p9ff.mongodb.net/qarzer";
const TG_TOKEN = "6874089411:AAHODLWxmg9Cm1rGE7k1HEgZkzygSGlm-aY";

// const mongoURI = "mongodb://localhost:27017/test";
// const mongoURI = "mongodb+srv://aliwerdev:1234@cluster0.qu6p9ff.mongodb.net/qarzer-test";
// const TG_TOKEN = "6514484502:AAEgDaHDKZz4InfMd1ZlA8bcf1IPdzWPpls";

mongoose
  .connect(mongoURI)
  .then((result) => {
    console.log("CONNECTED TO DB");
    new QarzerBot(TG_TOKEN);
  })
  .catch((err) => {
    console.log(err);
  });
