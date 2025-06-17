const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: String,   
  time: String,  
});

module.exports = mongoose.model('Reminder', ReminderSchema);
