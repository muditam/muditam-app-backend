const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config(); 
require('./cron/reminderCron');

const shopifyRoutes = require('./routes/shopify');
const userRoutes = require('./routes/user');
const quizRoutes = require('./routes/quiz');
const cartRoutes = require('./routes/cart');
const reminderRoutes = require('./routes/reminder');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection 
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB Error:', err)); 

// Routes
app.use('/api/shopify', shopifyRoutes);
app.use('/api/user', userRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reminder', reminderRoutes);


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
