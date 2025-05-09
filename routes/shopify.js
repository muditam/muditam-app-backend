const express = require('express');
const axios = require('axios');
const router = express.Router();

const SHOPIFY_API = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10`;

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
          first_variant_id: firstVariant.id,  
          images: p.images.map((img) => img.src),  
        };
      });
  
      res.json(formatted);
    } catch (err) {
      console.error('Shopify API error:', err.response?.data || err.message);
      res.status(500).json({ error: 'Failed to fetch tagged products' });
    }
  });

  
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
  

module.exports = router;
