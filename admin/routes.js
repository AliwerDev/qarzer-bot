// routes/auth.js
const express = require("express");
const router = express.Router();
const verifyToken = require("./verify-token");
const Group = require("../models/group");
const User = require("../models/user");

router.get("/user", verifyToken, async (req, res) => {
  const userId = req.userId;
  const result = {};
  try {
    result.user = await User.findById(userId + "s", "firstName lastName userName _id").cache(600, userId);
    if (!result.user) throw Error("User not found!");
    result.groups = await Group.find({ creatorId: userId }, "_id name currency");

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: "Something is wrong!" });
  }
});

router.get("/group/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const group = await Group.findById(id).populate("members", "_id firstName lastName userName chatId").cache(300, req.groupId);
    res.status(200).json(group);
  } catch (error) {
    res.status(400).json({ error: "Something is wrong" });
  }
});

router.get("/", async (req, res) => {
  res.status(200).json({ hello: "world" });
});

module.exports = router;
