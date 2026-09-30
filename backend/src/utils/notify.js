const Notification = require('../db/notificationModel');

// Fire-and-forget: a failed notification must never break the action that triggered it.
module.exports = async (userId, payload) => {
  try {
    if (userId) await Notification.create(userId, payload);
  } catch (err) {
    console.error('Notification failed:', err.message);
  }
};
