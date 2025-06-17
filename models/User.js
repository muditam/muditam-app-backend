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
  type: [String], // Shopify Product IDs
  default: [],
},
  expoPushToken: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
