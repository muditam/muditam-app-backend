const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  answers: {
    type: Object,
    required: true,
  },
  height: {
    type: Number,
    required: true,
  }, 
  weight: {
    type: Number,
    required: true, 
  },          
  hba1c: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Quiz', QuizSchema);
