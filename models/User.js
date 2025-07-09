const mongoose = require('mongoose');

// Subschema for video feedback
const likedVideoSchema = new mongoose.Schema({
  videoId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['like', 'dislike'],
    required: true,
  },
}, { _id: false }); 

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  name: String,
  yearOfBirth: String,
  gender: String, 
  preferredLanguage: {  
    type: String,
    enum: ['English', 'Hindi'],
    default: 'English',
  },
  email: String,
  avatar: { type: String, default: '' },

  hasPurchased: {
    type: Boolean,
    default: false,  
  },
  currentKitNumber: {
    type: Number,
    default: 1,
  },
  completedKits: {
    type: [Number],
    default: [],
  },
  purchasedProducts: {
    type: [String],  
    default: [],
  },
  expoPushToken: {
    type: String,
  },

  likedVideos: {
    type: [likedVideoSchema],
    default: [],
  },

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
