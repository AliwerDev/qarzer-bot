const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  userName: {
    type: String,
    required: true,
  },
  currentGroupId: { type: mongoose.Types.ObjectId, ref: "Group" },
  chatId: { type: Number, required: true },
  botStep: String,
  page: String,
});

module.exports = mongoose.model("User", userSchema);
