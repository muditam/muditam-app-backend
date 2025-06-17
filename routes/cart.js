// routes/cart.js
const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');

const SHOPIFY_API = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10`;

router.post('/create', async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const response = await axios.post(
      `${SHOPIFY_API}/carts.json`,
      {
        cart: {
          items: items.map(item => ({
            variant_id: item.variant_id,
            quantity: item.quantity,
          })),
        },
      },
      {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
        },
      }
    );

    const cartId = response.data.cart.id;
    res.status(200).json({ cartId });
  } catch (err) {
    console.error('Error creating Shopify cart:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create cart' });
  }
});

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
