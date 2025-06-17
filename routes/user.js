const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 🟣 Create new user
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

// 🟣 Update user details
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

// 🟣 Get user by phone
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

// 🟣 Check purchase status
router.get('/purchase-status/:phone', async (req, res) => {
  try {
    const user = await User.findOne({ phone: req.params.phone });
    res.json({ hasPurchased: !!user?.hasPurchased });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

router.post('/mark-purchased', async (req, res) => {
  const { phone, purchasedProductIds } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone is required' });

  try {
    const updated = await User.findOneAndUpdate(
      { phone },
      {
        hasPurchased: true,
        $addToSet: {
          purchasedProducts: { $each: purchasedProductIds || [] },
        },
      },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// 🟣 Get kit progress by phone
router.get('/kit-progress/:phone', async (req, res) => {
  try {
    const user = await User.findOne({ phone: req.params.phone });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      currentKit: user.currentKitNumber || 1,
      completedKits: user.completedKits || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch kit progress' });
  }
});

// 🟣 Update kit progress (e.g. after successful checkout)
router.post('/kit-progress/update', async (req, res) => {
  const { phone, newKitNumber } = req.body;
  if (!phone || !newKitNumber)
    return res.status(400).json({ error: 'Phone and newKitNumber are required' });

  try {
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // update current kit
    user.currentKitNumber = newKitNumber;

    // add previous kit to completed if not already
    const prevKit = newKitNumber - 1;
    if (prevKit >= 1 && !user.completedKits.includes(prevKit)) {
      user.completedKits.push(prevKit);
    }

    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update kit progress' });
  }
});

router.post('/save-token', async (req, res) => {
  const { userId, expoPushToken } = req.body;
  await User.findByIdAndUpdate(userId, { expoPushToken });
  res.send({ success: true });
});


module.exports = router