const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  name: String,
  yearOfBirth: String,
  gender: String,
  email: String,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
