// const mongoose = require('mongoose');

// const adSchema = new mongoose.Schema({
//   // Basic ad info
//   title: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   description: {
//     type: String,
//     trim: true
//   },
  
//   // AdMob specific configuration
//   adUnitId: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   adType: {
//     type: String,
//     required: true,
//     enum: ['banner', 'interstitial', 'rewarded', 'native'],
//     default: 'banner'
//   },
//   platform: {
//     type: String,
//     required: true,
//     enum: ['android', 'ios', 'web', 'all'],
//     default: 'all'
//   },
  
//   // AdMob credentials
//   appId: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   publisherId: {
//     type: String,
//     trim: true
//   },
  
//   // Display settings
//   position: {
//     type: String,
//     enum: ['top', 'bottom', 'center', 'custom'],
//     default: 'bottom'
//   },
//   isActive: {
//     type: Boolean,
//     default: true
//   },
//   frequency: {
//     type: Number,
//     default: 1, // How often to show (1 = every time)
//     min: 1,
//     max: 10
//   },
  
//   // Targeting
//   targetCountries: [{
//     type: String,
//     trim: true
//   }],
//   targetUserTypes: [{
//     type: String,
//     enum: ['free', 'premium', 'trial', 'all'],
//     default: 'all'
//   }],
  
//   // Analytics
//   impressions: {
//     type: Number,
//     default: 0
//   },
//   clicks: {
//     type: Number,
//     default: 0
//   },
  
//   // Admin controls
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   updatedBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   }
// }, {
//   timestamps: true
// });

// // Indexes for faster queries
// adSchema.index({ isActive: 1, platform: 1, adType: 1 });
// adSchema.index({ adUnitId: 1 }, { unique: true });

// module.exports = mongoose.model('Ad', adSchema);
const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  // Basic ad info
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },

  // Ad type and format
  adType: {
    type: String,
    required: true,
    enum: ['banner', 'interstitial', 'rewarded', 'native', 'video', 'html'],
    default: 'banner'
  },
  format: {
    type: String,
    enum: ['image', 'video', 'html', 'text'],
    required: true
  },

  // Ad content
  content: {
    // For image/video ads
    mediaUrl: {
      type: String,
      trim: true
    },
    // For HTML ads
    htmlContent: {
      type: String,
      trim: true
    },
    // For text ads
    textContent: {
      type: String,
      trim: true
    },
    // For all ads
    clickUrl: {
      type: String,
      required: true,
      trim: true
    }
  },

  // Dimensions and display settings
  width: {
    type: Number,
    min: 1
  },
  height: {
    type: Number,
    min: 1
  },
  aspectRatio: {
    type: String // e.g. "16:9"
  },

  // Targeting
  platforms: [{
    type: String,
    enum: ['web', 'android', 'ios', 'all'],
    default: 'all'
  }],
  countries: [{
    type: String,
    trim: true
  }],
  languages: [{
    type: String,
    trim: true
  }],
  userSegments: [{
    type: String,
    enum: ['free', 'premium', 'new', 'returning', 'all'],
    default: 'all'
  }],

  // Scheduling
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // Frequency capping
  maxImpressions: {
    type: Number,
    min: 1
  },
  frequencyCap: {
    type: Number, // Max impressions per user
    min: 1
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },

  // Ad network configuration
  network: {
    type: String,
    enum: ['admob', 'facebook', 'custom', 'direct'],
    required: true
  },
  networkConfig: {
    // For AdMob
    adUnitId: {
      type: String,
      trim: true
    },
    appId: {
      type: String,
      trim: true
    },
    publisherId: {
      type: String,
      trim: true
    },
    // For Facebook
    placementId: {
      type: String,
      trim: true
    },
    // For custom networks
    customConfig: {
      type: mongoose.Schema.Types.Mixed
    }
  },

  // Analytics
  impressions: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  ctr: {
    type: Number,
    default: 0
  },

  // Admin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for active status considering schedule
adSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && 
         (!this.startDate || this.startDate <= now) && 
         (!this.endDate || this.endDate >= now);
});

// Indexes
adSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
adSchema.index({ platforms: 1 });
adSchema.index({ network: 1 });

// Pre-save hook to calculate CTR
adSchema.pre('save', function(next) {
  if (this.impressions > 0) {
    this.ctr = (this.clicks / this.impressions) * 100;
  }
  next();
});

module.exports = mongoose.model('Ad', adSchema);