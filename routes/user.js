const express = require('express');
const router = express.Router();
const User = require('../models/User'); 

// Check if user exists (returns plain JS object with .lean())
router.get('/:phone', async (req, res) => {
  try {
    const user = await User.findOne({ phone: req.params.phone }).lean();
    if (user) return res.status(200).json(user);
    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create new user
router.post('/', async (req, res) => {
  const { phone, name, yearOfBirth, gender, email } = req.body;
  try {
    let user = await User.findOne({ phone });
    if (user) return res.status(200).json(user);  

    user = new User({ phone, name, yearOfBirth, gender, email });
    await user.save();
    return res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Could not create user' });
  }
});

router.post('/update', async (req, res) => {
  const { phone, name, yearOfBirth, gender, email } = req.body;
  try {
    const updatedUser = await User.findOneAndUpdate(
      { phone },
      { name, yearOfBirth, gender, email },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found for update' });
    }

    return res.status(200).json({ success: true, message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ success: false, error: 'Could not update user' });
  }
});


module.exports = router;
