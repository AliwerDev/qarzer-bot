const mongoose = require("mongoose");
const app = require("express")();
const cors = require("cors");
const cachegoose = require("recachegoose");
const QarzerBot = require("./bot/qarzer");
const routes = require("./admin/routes");
const { mongo_url, tg_token } = require("./config");

cachegoose(mongoose, {
  engine: "memory",
});

app.use(cors());
app.use("/api", routes);

mongoose
  .connect(mongo_url)
  .then(() => {
    console.log("CONNECTED TO DB");
    new QarzerBot(tg_token);
  })
  .catch((err) => {
    console.log(err);
  });
