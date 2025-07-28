const express = require('express');
const axios = require('axios');
const router = express.Router();
const User = require('../models/User');


const SHOPIFY_API = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10`;

/**
 * GET /api/shopify/products
 * Fetch all published products tagged with "product"
 */
router.get('/products', async (req, res) => {
  try {
    const response = await axios.get(`${SHOPIFY_API}/products.json?limit=250`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
      },
    });

    const products = response.data.products;

    const tagged = products.filter(
      (p) =>
        p.status !== 'draft' &&
        p.tags?.toLowerCase().includes('product') &&
        Array.isArray(p.variants) &&
        p.variants.length > 0
    );

    const formatted = tagged.map((p) => {
      const firstVariant = p.variants[0];
      return {
        id: p.id,
        title: p.title,
        description: p.body_html,
        image: p.image?.src,
        price: firstVariant.price,
        compare_at_price: firstVariant.compare_at_price,
        first_variant_id: firstVariant.id, // ✅ Needed for Shopify cart
        images: p.images.map((img) => img.src),
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Shopify API error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch tagged products' });
  }
});

/**
 * GET /api/shopify/product/:id
 * Fetch detailed info about a single product and its variants with metafields
 */
router.get('/product/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const productRes = await axios.get(`${SHOPIFY_API}/products/${id}.json`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
      },
    });

    const product = productRes.data.product;

    const variants = await Promise.all(
      product.variants.map(async (v) => {
        const metaRes = await axios.get(
          `${SHOPIFY_API}/variants/${v.id}/metafields.json`,
          {
            headers: {
              'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
            },
          }
        );

        const metafields = metaRes.data.metafields.reduce((acc, m) => {
          if (m.namespace === 'custom') acc[m.key] = m.value;
          return acc;
        }, {});

        return {
          id: v.id,
          title: v.title,
          price: parseInt(v.price),
          compare_at_price: v.compare_at_price,
          image: v.image?.src || null,
          metafields: { custom: metafields },
        };
      })
    );

    res.json({
      id: product.id,
      title: product.title,
      description: product.body_html,
      images: product.images.map((img) => img.src),
      variants,
    });
  } catch (err) {
    console.error('Shopify API error:', err.response?.data || err.message); 
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

/**
 * POST /api/shopify/create-cart
 * Creates a Shopify cart using product variant IDs from cartItems
 */
router.post('/create-cart', async (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No cart items provided' });
  }

  try {
    const response = await axios.post(
      'https://muditam.myshopify.com/api/2023-10/graphql.json',
      {
        query: `
          mutation cartCreate($input: CartInput!) {
            cartCreate(input: $input) {
              cart {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: {
          input: {
            lines: items.map((item) => ({
              quantity: item.quantity,
              merchandiseId: `gid://shopify/ProductVariant/${item.first_variant_id}`,
            })),
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
        },
      }
    );

    const cartCreate = response.data.data.cartCreate;
    const cartId = cartCreate.cart?.id;
    const userErrors = cartCreate.userErrors;

    if (userErrors.length > 0) {
      console.error('Shopify cartCreate userErrors:', userErrors);
      return res.status(400).json({ error: 'Shopify error', userErrors });
    }

    if (!cartId) {
      console.error('No cart ID returned:', response.data);
      return res.status(400).json({ error: 'No cart ID returned from Shopify' });
    }

    return res.json({ cartId });
  } catch (err) {
    console.error('Error creating Shopify cart:', err.response?.data || err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/purchased-products/:phone', async (req, res) => {
  try {
    const user = await User.findOne({ phone: req.params.phone });
    if (!user) return res.status(404).json({ error: 'User not found here' });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPurchases = (user.purchasedProducts || [])
      .filter(p => new Date(p.purchasedAt) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt)); // latest first

    if (recentPurchases.length === 0) return res.json([]);

    const allProductIds = recentPurchases.map(p => p.productId);

    const shopifyRes = await axios.get(`${SHOPIFY_API}/products.json?limit=250`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
      },
    });

    const allProducts = shopifyRes.data.products;

    const results = recentPurchases.map((purchase) => {
      const product = allProducts.find(p => String(p.id) === purchase.productId);
      if (!product || product.status === 'draft') return null;

      const firstVariant = product.variants?.[0];

      return {
        id: product.id,
        title: product.title,
        description: product.body_html,
        image: product.image?.src,
        price: firstVariant?.price,
        compare_at_price: firstVariant?.compare_at_price, 
        first_variant_id: firstVariant?.id,
        images: product.images?.map(img => img.src),
        purchasedAt: purchase.purchasedAt,
      };
    }).filter(Boolean);

    res.json(results);
  } catch (err) {
    console.error('Error fetching purchased products:', err.response?.data || err.message); 
    res.status(500).json({ error: 'Failed to fetch purchased products' });
  }
});

router.get('/customer-history/:phone', async (req, res) => {
  try {
    // 1. Get customer data by phone number
    const user = await User.findOne({ phone: req.params.phone });
    if (!user) {
      console.log(`User with phone ${req.params.phone} not found`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('User found:', user.name);

    // 2. Fetch customer order history from Shopify based on user email or phone
    // Assuming you use the user's email (or you could use the phone if mapped in Shopify)
    const shopifyCustomerRes = await axios.get(`${SHOPIFY_API}/customers/search.json?query=email:${user.email}`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
      },
    });

    const shopifyCustomer = shopifyCustomerRes.data.customers[0];
    if (!shopifyCustomer) {
      console.log('No customer found on Shopify with this email');
      return res.status(404).json({ error: 'No Shopify customer found' });
    }

    // 3. Fetch orders for this customer from Shopify
    const shopifyOrdersRes = await axios.get(`${SHOPIFY_API}/orders.json?customer_id=${shopifyCustomer.id}&status=any`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
      },
    });

    const shopifyOrders = shopifyOrdersRes.data.orders;

    // 4. Format the orders and return the response
    const formattedHistory = shopifyOrders.map(order => {
      return order.line_items.map(item => ({
        orderName: order.name,
        customerName: user.name,
        productName: item.name,
        productImage: item.image ? item.image.src : null, 
        price: item.price,
        quantity: item.quantity,
        totalAmount: (item.price * item.quantity).toFixed(2),
        purchaseDate: new Date(order.created_at).toLocaleDateString(),
      }));
    }).flat();  // Flatten the nested array of line items

    console.log('Formatted purchase history:', formattedHistory); // Debug: Check formatted data

    res.json(formattedHistory);  // Send formatted data back to the frontend
  } catch (err) {
    console.error('Error fetching customer history:', err.response?.data || err.message); 
    res.status(500).json({ error: 'Failed to fetch customer purchase history' });
  }
});


module.exports = router;
