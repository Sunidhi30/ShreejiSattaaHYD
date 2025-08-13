// const mongoose = require('mongoose');

// const transactionSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   sessionId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'UserSession',
//     required: true
//   },
//   amount: {
//     type: Number,
//     required: true
//   },
//   type: {
//     type: String,
//     enum: ['earned', 'deducted', 'bonus'],
//     default: 'earned'
//   },
//   description: {
//     type: String,
//     default: 'Time-based earning'
//   },
//   transactionDate: {
//     type: Date,
//     default: Date.now
//   }
// }, {
//   timestamps: true
// });

// module.exports = mongoose.model('Transaction', transactionSchema);
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserSession',
    required: false // Made optional for subscription transactions
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['earned', 'deducted', 'bonus', 'subscription', 'cancelled'],
    default: 'earned'
  },
  description: {
    type: String,
    default: 'Time-based earning'
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  // Added payment details for Razorpay transactions
  paymentDetails: {
    razorpay_payment_id: String,
    razorpay_order_id: String,
    razorpay_signature: String,
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription'
    },
    subscriptionName: String,
    paymentMethod: {
      type: String,
      default: 'razorpay'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed'
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
transactionSchema.index({ userId: 1, transactionDate: -1 });
transactionSchema.index({ 'paymentDetails.razorpay_payment_id': 1 });

module.exports = mongoose.model('Transaction', transactionSchema);