// models/Cart.js
const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  items: [
    {
      id: String,
      title: String,
      price: Number,
      image: String,
      quantity: Number,
    },
  ],
});

module.exports = mongoose.model('Cart', CartSchema);
