const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const User = require('../models/User');
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

cron.schedule('* * * * *', async () => {
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5);

  const reminders = await Reminder.find({ time: hhmm }).populate('userId');

  for (const reminder of reminders) {
  const user = reminder.userId;
  if (!user?.expoPushToken || !Expo.isExpoPushToken(user.expoPushToken)) {
    console.warn(`🚫 Invalid or missing token for ${user.name || user._id}`);
    continue;
  }

  const bodyText = {
    water: '💧 Time to drink water!',
    food: '🍱 Time for your healthy meal!',
    walk: '🚶‍♂️ Time to go for a walk!',
  }[reminder.type] || 'Time to take care of yourself!'; 

  const message = {
    to: user.expoPushToken,
    sound: 'default',
    title: 'Muditam Reminder',
    body: bodyText,
  };

  try {
    const receipts = await expo.sendPushNotificationsAsync([message]); 
  } catch (err) {
    console.error('❌ Push failed:', err);
  }
  }
});
