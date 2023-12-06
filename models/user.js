const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  firstName: String,
  lastName: String,
  userName: String,
  botStep: String,
  currentGroupId: { type: mongoose.Types.ObjectId, ref: "Group" },
  chatId: { type: Number, required: true },

  incomplatedExpense: {
    amount: Number,
    description: String,
    distributionType: String,
    amountForOneDebtor: Number,
    debtors: [String],
  },
});

module.exports = mongoose.model("User", userSchema);
