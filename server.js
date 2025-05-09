const express = require('express');
const cors = require('cors');
require('dotenv').config();

const shopifyRoutes = require('./routes/shopify');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/shopify', shopifyRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
