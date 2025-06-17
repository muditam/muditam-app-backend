const express = require('express');
const Reminder = require('../models/Reminder');
const router = express.Router();

router.post('/', async (req, res) => {
  const { userId, type, time } = req.body;
  const existing = await Reminder.findOne({ userId, type });
  if (existing) {
    existing.time = time;
    await existing.save();
  } else {
    await Reminder.create({ userId, type, time });
  }
  res.status(200).send({ success: true });
});

router.get('/:userId', async (req, res) => {
  const reminders = await Reminder.find({ userId: req.params.userId });
  res.send(reminders);
});

module.exports = router;
