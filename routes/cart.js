// routes/cart.js
const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');

// Save or update cart
router.post('/save', async (req, res) => {
  const { phone, items } = req.body;

  if (!phone || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const updated = await Cart.findOneAndUpdate(
      { phone },
      { items },
      { upsert: true, new: true }
    );
    res.status(200).json({ message: 'Cart saved', cart: updated });
  } catch (err) {
    console.error('Error saving cart:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Get cart by phone
router.get('/:phone', async (req, res) => {
  try {
    const cart = await Cart.findOne({ phone: req.params.phone });
    if (!cart) return res.status(404).json({ items: [] }); // empty cart
    res.status(200).json(cart);
  } catch (err) {
    console.error('Error fetching cart:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
