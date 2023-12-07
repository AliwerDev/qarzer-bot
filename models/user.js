const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    firstName: String,
    lastName: String,
    userName: String,
    botStep: String,
    currentGroupId: { type: mongoose.Types.ObjectId, ref: "Group" },
    chatId: { type: Number, required: true },

    incomplatedGroupName: String,
    incomplatedExpense: {
      amount: Number,
      description: String,
      distributionType: String,
      amountForOneDebtor: Number,
      currency: String,
      debtors: [String],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
