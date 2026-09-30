const Notification = require('../db/notificationModel');

module.exports = async (userId, payload) => {
  try {
    if (userId) await Notification.create(userId, payload);
  } catch (err) {
    console.error('Notification failed:', err.message);
  }
};
