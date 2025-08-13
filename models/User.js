const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  profileImage: {
    type: String,
    default: 'https://t3.ftcdn.net/jpg/09/48/09/30/360_F_948093078_6kRWXnAWFNEaakRMX5OM9CRNNj2gdIfw.jpg'   // default empty string
  },
  password: {
    type: String,
    required: false,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  depositScreenshots: [
    {
      url: String,
      transactionId: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  ], 
  wallet: {
    balance: {
      type: Number,
      default: 0
    },
   
    totalWithdrawals: {
      type: Number,
      default: 0
    },
  
    commission: {
      type: Number,
      default: 0
    }
  },
  mobile: {
    type: Number,
    default: 0
  },
  totalMoney: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  referralCode: {
    type: String,
    unique: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  currentSession: {
    loginTime: Date,
    isOnline: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
