const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const groupSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  members: [{ type: mongoose.Types.ObjectId, ref: "User" }],
  creatorId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
});

module.exports = mongoose.model("Group", groupSchema);
