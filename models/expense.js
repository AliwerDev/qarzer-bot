const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const expenseSchema = new Schema({
  amount: { type: Number, required: true },
  groupId: { type: mongoose.Types.ObjectId, ref: "Group", required: true },
  creatorId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  status: {
    type: String,
    required: true,
    default: "active",
    enum: ["active", "paid"],
  },
  description: { type: String },
  relatedTo: { type: mongoose.Types.ObjectId, ref: "User" },
});

module.exports = mongoose.model("Expense", expenseSchema);
