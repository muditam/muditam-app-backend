const express = require('express');
const router = express.Router();
const Quiz = require('../models/quiz');
const User = require('../models/User');

// Upsert quiz entry based on phone number
router.post('/submit', async (req, res) => {
  try {
    const { answers, height, weight, hba1c, phone } = req.body;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Invalid or missing answers' });
    }

    if (height == null || weight == null || hba1c == null || !phone) {
      return res.status(400).json({ error: 'Missing height, weight, hba1c, or phone' });
    }

    // Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update existing quiz or insert new for this phone number
    const quiz = await Quiz.findOneAndUpdate(
      { phone },
      { answers, height, weight, hba1c },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: 'Quiz saved successfully', quiz });
  } catch (err) {
    console.error('Error saving quiz:', err);
    res.status(500).json({ error: 'Server error' }); 
  }
});

// GET latest quiz by phone
router.get('/:phone', async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ phone: req.params.phone }).lean();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.status(200).json(quiz);
  } catch (err) {
    console.error('Error fetching quiz:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
