const mongoose = require("mongoose");
const app = require("express")();
const cors = require("cors");
const cachegoose = require("recachegoose");
const QarzerBot = require("./bot/qarzer");
const { TG_TOKEN, MONGO_URL, PORT } = require("./const");
const routes = require("./admin/routes");

cachegoose(mongoose, {
  engine: "memory",
});

app.use(cors());
app.use("/api", routes);

// app.listen(PORT, () => {
//   console.log(`QARZER app listening on port ${PORT}`);
// });

mongoose
  .connect(MONGO_URL)
  .then((result) => {
    console.log("CONNECTED TO DB");
    new QarzerBot(TG_TOKEN);
  })
  .catch((err) => {
    console.log(err);
  });
