// models/AdMob.js
const mongoose = require('mongoose');

const admobSchema = new mongoose.Schema({
  adType: {
    type: String,
    required: true,
    enum: ['banner', 'interstitial', 'rewarded', 'native'],
    index: true
  },
  publisherId: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Validate AdMob publisher ID format
        return /^ca-app-pub-\d{16}\/\d{10}$/.test(v);
      },
      message: 'Invalid AdMob Publisher ID format'
    }
  },
  adName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  placement: {
    type: String,
    enum: ['home', 'games', 'profile', 'wallet', 'global'],
    default: 'global'
  },
  frequency: {
    type: Number,
    default: 1, // Show ad every X times
    min: 1
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  clicks: {
    type: Number,
    default: 0
  },
  impressions: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Ensure unique ad type per placement
admobSchema.index({ adType: 1, placement: 1 }, { unique: true });

module.exports = mongoose.model('AdMob', admobSchema);
