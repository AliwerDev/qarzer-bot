const express = require("express");
const mongoose = require("mongoose");
require("./bot/bot")();

const mongoURI = "mongodb+srv://aliwerdev:1234@cluster0.qu6p9ff.mongodb.net/qarzer";

const app = express();
app.use(express.json());

mongoose
  .connect(mongoURI)
  .then((result) => {
    console.log("CONNECTED TO DB");
    app.listen(3000, () => {
      console.log("The server is active on port 3000");
    });
  })
  .catch((err) => {
    console.log(err);
  });
