const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// All users except me
router.get('/users', async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user.id } }).select('username').sort('username');
  res.json(users);
});

// Last 100 messages between me and :userId
router.get('/messages/:userId', async (req, res) => {
  const other = req.params.userId;
  if (!mongoose.isValidObjectId(other)) return res.status(400).json({ error: 'Invalid user id' });

  const me = req.user.id;
  const messages = await Message.find({
    $or: [
      { sender: me, receiver: other },
      { sender: other, receiver: me },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.json(messages.reverse());
});

module.exports = router;