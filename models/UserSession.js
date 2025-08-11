const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  loginTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  logoutTime: {
    type: Date
  },
  sessionDuration: {
    type: Number, // in minutes
    default: 0
  },
  moneyEarned: {
    type: Number,
    default: 0
  },
  ratePerMinute: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('UserSession', userSessionSchema);