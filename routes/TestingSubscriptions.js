// const express = require('express');
// require('dotenv').config()
// const Razorpay = require('razorpay');
// const crypto = require('crypto');
// const User = require('../models/User'); // Adjust path as needed
// const Subscription = require('../models/Subscription'); // Adjust path as needed
// const Transaction = require('../models/Transaction'); // Adjust path as needed
// const jwt = require('jsonwebtoken');
// const router = express.Router();
// // Initialize Razorpay
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY,
//   key_secret: process.env.RAZORPAY_SECRET,
//   RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET
// });
// // Middleware to verify JWT token (add your auth middleware)
// const authMiddleware = async (req, res, next) => {
//     try {
//       const token = req.header('Authorization')?.replace('Bearer ', '');
//       console.log('🔍 Incoming Token:', token);
  
//       if (!token) {
//         return res.status(401).json({ message: 'No token provided' });
//       }
  
//       const secret = process.env.JWT_SECRET || 'Apple';
//       console.log('🔑 JWT Secret being used for verification:', secret);
  
//       const decoded = jwt.verify(token, secret);
//       console.log('✅ Decoded token payload:', decoded);
  
//       const user = await User.findById(decoded.userId);
//       if (!user) {
//         console.log('❌ No user found for ID:', decoded.userId);
//         return res.status(401).json({ message: 'User not found' });
//       }
  
//       req.user = user;
//       console.log('✅ Authenticated user:', user.email);
//       next();
//     } catch (error) {
//       console.error('❌ JWT verification failed:', error.message);
//       res.status(401).json({ message: 'Token is not valid' });
//     }
// };
// // GET /api/subscriptions - Get all active subscription plans
// router.get('/subscriptions', async (req, res) => {
//   try {
//     const subscriptions = await Subscription.find({ isActive: true })
//       .select('name description price duration features');
    
//     res.json({
//       success: true,
//       data: subscriptions
//     });
//   } catch (error) {
//     console.error('Error fetching subscriptions:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch subscription plans'
//     });
//   }
// });
// // POST /api/subscriptions/create-order - Create Razorpay order
// router.post('/subscriptions/create-order', authMiddleware, async (req, res) => {
//   try {
//     const { subscriptionId } = req.body;
//     const userId =req.user._id
//     console.log("this is user ",userId)

//     // Validate subscription
//     const subscription = await Subscription.findById(subscriptionId);
//     if (!subscription || !subscription.isActive) {
//       return res.status(404).json({
//         success: false,
//         message: 'Subscription plan not found or inactive'
//       });
//     }

//     // Get user details
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     // Create Razorpay order
//     const orderOptions = {
//         amount: subscription.price * 100, // Convert to paise
//         currency: 'INR',
//         receipt: `sub_${subscriptionId.slice(-6)}_${userId.toString().slice(-6)}_${Date.now()}`,
//         notes: {
//           userId: userId.toString(),
//           subscriptionId: subscriptionId.toString(),
//           subscriptionName: subscription.name
//         }
//       };
      

//       const order = await razorpay.orders.create(orderOptions);

//     res.json({
//       success: true,
//       data: {
//         orderId: order.id,
//         amount: order.amount,
//         currency: order.currency,
//         subscription: {
//           id: subscription._id,
//           name: subscription.name,
//           price: subscription.price,
//           duration: subscription.duration,
//           features: subscription.features
//         },
//         userDetails: {
//           name: user.username,
//           email: user.email,
//           contact: user.mobile || ''
//         }
//       }
//     });

//   } catch (error) {
//     console.error('Error creating Razorpay order:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create payment order'
//     });
//   }
// });
// // POST /api/subscriptions/verify-payment - Verify payment and activate subscription
// // router.post('/subscriptions/verify-payment', authMiddleware, async (req, res) => {
// //   try {
// //     const {
// //       razorpay_payment_id,
// //       razorpay_order_id,
// //       razorpay_signature,
// //       subscriptionId
// //     } = req.body;
    
// //     const userId = req.userId;

// //     // Verify signature
// //     const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
// //     hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
// //     const generated_signature = hmac.digest('hex');

// //     if (generated_signature !== razorpay_signature) {
// //       return res.status(400).json({
// //         success: false,
// //         message: 'Payment verification failed'
// //       });
// //     }

// //     // Get subscription details
// //     const subscription = await Subscription.findById(subscriptionId);
// //     if (!subscription) {
// //       return res.status(404).json({
// //         success: false,
// //         message: 'Subscription not found'
// //       });
// //     }

// //     // Get user
// //     const user = await User.findById(userId);
// //     if (!user) {
// //       return res.status(404).json({
// //         success: false,
// //         message: 'User not found'
// //       });
// //     }

// //     // Create transaction record
// //     const transaction = new Transaction({
// //       userId: userId,
// //       sessionId: null, // You can create a session ID if needed
// //       amount: subscription.price,
// //       type: 'deducted',
// //       description: `Subscription purchase: ${subscription.name}`,
// //       paymentDetails: {
// //         razorpay_payment_id,
// //         razorpay_order_id,
// //         razorpay_signature,
// //         subscriptionId,
// //         subscriptionName: subscription.name
// //       }
// //     });

// //     await transaction.save();

// //     // Add subscription to user (you might want to create a UserSubscription model)
// //     // For now, we'll add it to user's data
// //     const subscriptionEndDate = new Date();
// //     subscriptionEndDate.setDate(subscriptionEndDate.getDate() + subscription.duration);

// //     // You might want to create a separate UserSubscription model
// //     // For now, adding to user object
// //     if (!user.subscriptions) {
// //       user.subscriptions = [];
// //     }
    
// //     user.subscriptions.push({
// //       subscriptionId: subscription._id,
// //       subscriptionName: subscription.name,
// //       purchaseDate: new Date(),
// //       expiryDate: subscriptionEndDate,
// //       isActive: true,
// //       paymentId: razorpay_payment_id
// //     });

// //     await user.save();

// //     res.json({
// //       success: true,
// //       message: 'Subscription activated successfully',
// //       data: {
// //         subscription: {
// //           name: subscription.name,
// //           expiryDate: subscriptionEndDate,
// //           features: subscription.features
// //         },
// //         transaction: {
// //           id: transaction._id,
// //           amount: transaction.amount,
// //           date: transaction.transactionDate
// //         }
// //       }
// //     });

// //   } catch (error) {
// //     console.error('Error verifying payment:', error);
// //     res.status(500).json({
// //       success: false,
// //       message: 'Payment verification failed'
// //     });
// //   }
// // });
// // POST /subscriptions/verify-payment
// router.post("/subscriptions/verify-payment", authMiddleware, async (req, res) => {
//     try {
//       console.log("📦 Received request body:", req.body);
  
//       const {
//         razorpay_payment_id,
//         razorpay_order_id,
//         razorpay_subscription_id, // from Razorpay if it's a subscription
//         razorpay_signature,
//         subscriptionId,
//       } = req.body;
  
//       const userId = req.userId;
  
//       console.log("✅ Authenticated user ID:", userId);
//       console.log("🔍 order_id:", razorpay_order_id || "N/A");
//       console.log("🔍 payment_id:", razorpay_payment_id || "N/A");
//       console.log("🔍 razorpay_subscription_id:", razorpay_subscription_id || "N/A");
//       console.log("🔍 signature:", razorpay_signature || "N/A");
//       console.log("🔍 secret from env:", process.env.RAZORPAY_KEY_SECRET);
  
//       // Validate presence of required fields
//       if (!razorpay_signature || !razorpay_payment_id) {
//         return res.status(400).json({
//           success: false,
//           message: "Missing razorpay_signature or razorpay_payment_id",
//         });
//       }
  
//       if (!razorpay_order_id && !razorpay_subscription_id) {
//         return res.status(400).json({
//           success: false,
//           message: "Missing order_id or subscription_id for verification",
//         });
//       }
  
//       // Prepare payload for signature verification
//       const payload = razorpay_order_id
//         ? `${razorpay_order_id}|${razorpay_payment_id}`
//         : `${razorpay_subscription_id}|${razorpay_payment_id}`;
  
//       // Verify signature
//       const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
//       hmac.update(payload);
//       const generated_signature = hmac.digest("hex");
  
//       if (generated_signature !== razorpay_signature) {
//         console.log("❌ Signature mismatch!");
//         return res.status(400).json({
//           success: false,
//           message: "Payment verification failed - Signature mismatch",
//         });
//       }
  
//       // Get subscription plan details
//       const subscription = await Subscription.findById(subscriptionId);
//       if (!subscription) {
//         return res.status(404).json({
//           success: false,
//           message: "Subscription not found",
//         });
//       }
  
//       // Get user details
//       const user = await User.findById(userId);
//       if (!user) {
//         return res.status(404).json({
//           success: false,
//           message: "User not found",
//         });
//       }
  
//       // Save transaction
//       const transaction = new Transaction({
//         userId: userId,
//         amount: subscription.price,
//         type: "deducted",
//         description: `Subscription purchase: ${subscription.name}`,
//         paymentDetails: {
//           razorpay_payment_id,
//           razorpay_order_id,
//           razorpay_subscription_id,
//           razorpay_signature,
//           subscriptionId,
//           subscriptionName: subscription.name,
//         },
//       });
  
//       await transaction.save();
  
//       // Calculate expiry
//       const subscriptionEndDate = new Date();
//       subscriptionEndDate.setDate(subscriptionEndDate.getDate() + subscription.duration);
  
//       // Update user's subscriptions
//       user.subscriptions = user.subscriptions || [];
//       user.subscriptions.push({
//         subscriptionId: subscription._id,
//         subscriptionName: subscription.name,
//         purchaseDate: new Date(),
//         expiryDate: subscriptionEndDate,
//         isActive: true,
//         paymentId: razorpay_payment_id,
//       });
  
//       await user.save();
  
//       res.json({
//         success: true,
//         message: "Subscription activated successfully",
//         data: {
//           subscription: {
//             name: subscription.name,
//             expiryDate: subscriptionEndDate,
//             features: subscription.features,
//           },
//           transaction: {
//             id: transaction._id,
//             amount: transaction.amount,
//             date: transaction.transactionDate,
//           },
//         },
//       });
//     } catch (error) {
//       console.error("Error verifying payment:", error);
//       res.status(500).json({
//         success: false,
//         message: "Payment verification failed",
//       });
//     }
//   });
  
  
// // GET /api/subscriptions/user - Get user's active subscriptions
// router.get('/subscriptions/user', authMiddleware, async (req, res) => {
//   try {
//     const userId = req.userId;
    
//     const user = await User.findById(userId).select('subscriptions');
    
//     if (!user || !user.subscriptions) {
//       return res.json({
//         success: true,
//         data: []
//       });
//     }

//     // Filter active subscriptions
//     const activeSubscriptions = user.subscriptions.filter(sub => 
//       sub.isActive && sub.expiryDate > new Date()
//     );

//     res.json({
//       success: true,
//       data: activeSubscriptions
//     });

//   } catch (error) {
//     console.error('Error fetching user subscriptions:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch user subscriptions'
//     });
//   }
// });
// // GET /api/subscriptions/transactions - Get subscription-related transactions
// router.get('/subscriptions/transactions', authMiddleware, async (req, res) => {
//   try {
//     const userId = req.userId;
//     const { page = 1, limit = 10 } = req.query;

//     const transactions = await Transaction.find({
//       userId,
//       description: { $regex: /subscription/i }
//     })
//     .sort({ transactionDate: -1 })
//     .limit(parseInt(limit))
//     .skip((parseInt(page) - 1) * parseInt(limit));

//     const totalCount = await Transaction.countDocuments({
//       userId,
//       description: { $regex: /subscription/i }
//     });

//     res.json({
//       success: true,
//       data: {
//         transactions,
//         pagination: {
//           currentPage: parseInt(page),
//           totalPages: Math.ceil(totalCount / parseInt(limit)),
//           totalRecords: totalCount,
//           hasNext: page < Math.ceil(totalCount / limit),
//           hasPrev: page > 1
//         }
//       }
//     });

//   } catch (error) {
//     console.error('Error fetching subscription transactions:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch transactions'
//     });
//   }
// });
// // POST /api/subscriptions/cancel - Cancel user subscription
// router.post('/subscriptions/cancel', authMiddleware, async (req, res) => {
//   try {
//     const { subscriptionId } = req.body;
//     const userId = req.userId;

//     const user = await User.findById(userId);
//     if (!user || !user.subscriptions) {
//       return res.status(404).json({
//         success: false,
//         message: 'No subscriptions found'
//       });
//     }

//     // Find and deactivate subscription
//     const subscription = user.subscriptions.find(
//       sub => sub.subscriptionId.toString() === subscriptionId && sub.isActive
//     );

//     if (!subscription) {
//       return res.status(404).json({
//         success: false,
//         message: 'Active subscription not found'
//       });
//     }

//     subscription.isActive = false;
//     subscription.cancelledDate = new Date();

//     await user.save();

//     // Create transaction record for cancellation
//     const transaction = new Transaction({
//       userId: userId,
//       sessionId: null,
//       amount: 0,
//       type: 'bonus', // or create a new type 'cancelled'
//       description: `Subscription cancelled: ${subscription.subscriptionName}`
//     });

//     await transaction.save();

//     res.json({
//       success: true,
//       message: 'Subscription cancelled successfully'
//     });

//   } catch (error) {
//     console.error('Error cancelling subscription:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to cancel subscription'
//     });
//   }
// });
// module.exports = router;
const express = require('express');
require('dotenv').config()
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User'); // Adjust path as needed
const Subscription = require('../models/Subscription'); // Adjust path as needed
const Transaction = require('../models/Transaction'); // Adjust path as needed
const jwt = require('jsonwebtoken');
const router = express.Router();
// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET
});
// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      console.log('🔍 Incoming Token:', token);
  
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }
  
      const secret = process.env.JWT_SECRET || 'Apple';
      console.log('🔑 JWT Secret being used for verification:', secret);
  
      const decoded = jwt.verify(token, secret);
      console.log('✅ Decoded token payload:', decoded);
  
      const user = await User.findById(decoded.userId);
      if (!user) {
        console.log('❌ No user found for ID:', decoded.userId);
        return res.status(401).json({ message: 'User not found' });
      }
  
      req.user = user;
      req.userId = user._id; // Consistent user ID reference
      console.log('✅ Authenticated user:', user.email);
      next();
    } catch (error) {
      console.error('❌ JWT verification failed:', error.message);
      res.status(401).json({ message: 'Token is not valid' });
    }
};
// GET /api/subscriptions - Get all active subscription plans
router.get('/active-subscriptions', async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ isActive: true })
      .select('name description price duration features');
    
    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans'
    });
  }
});
// POST /api/subscriptions/create-order - Create Razorpay order
router.post('/create-order', authMiddleware, async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const userId = req.userId;
    // console.log("this is user ", userId);

    // Validate input
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID is required'
      });
    }

    // Validate subscription
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription || !subscription.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found or inactive'
      });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create Razorpay order
    const orderOptions = {
        amount: subscription.price * 100, // Convert to paise
        currency: 'INR',
        receipt: `sub_${subscriptionId.slice(-6)}_${userId.toString().slice(-6)}_${Date.now()}`,
        notes: {
          userId: userId.toString(),
          subscriptionId: subscriptionId.toString(),
          subscriptionName: subscription.name
        }
      };

    const order = await razorpay.orders.create(orderOptions);

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        subscription: {
          id: subscription._id,
          name: subscription.name,
          price: subscription.price,
          duration: subscription.duration,
          features: subscription.features
        },
        userDetails: {
          name: user.username,
          email: user.email,
          contact: user.mobile || ''
        }
      }
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order'
    });
  }
});
router.post("/verify-payment", authMiddleware, async (req, res) => {
    try {
      console.log("📦 Received request body:", req.body);
  
      const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_subscription_id,
        razorpay_signature,
        subscriptionId,
      } = req.body;
  
      const userId = req.userId;
  
      // Validate required fields
      if (!razorpay_payment_id || !razorpay_signature || !subscriptionId) {
        return res.status(400).json({
          success: false,
          message: "Missing required payment verification fields"
        });
      }
  
      if (!razorpay_order_id && !razorpay_subscription_id) {
        return res.status(400).json({
          success: false,
          message: "Either razorpay_order_id or razorpay_subscription_id is required"
        });
      }
  
      // Verify signature
      const payload = razorpay_order_id
        ? `${razorpay_order_id}|${razorpay_payment_id}`
        : `${razorpay_subscription_id}|${razorpay_payment_id}`;
  
      const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET);
      hmac.update(payload);
      const generated_signature = hmac.digest("hex");
  
      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: "Payment verification failed - Signature mismatch"
        });
      }
  
      // Get subscription and user
      const [subscription, user] = await Promise.all([
        Subscription.findById(subscriptionId),
        User.findById(userId)
      ]);
  
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription plan not found"
        });
      }
  
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
  
      // Calculate expiry date
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + subscription.duration);
  
      // Create and save transaction
      const transaction = new Transaction({
        userId: userId,
        amount: subscription.price,
        type: "subscription", // Changed from "deducted" to match your schema
        description: `Subscription purchase: ${subscription.name}`,
        paymentDetails: {
          razorpay_payment_id,
          razorpay_order_id: razorpay_order_id || undefined,
          razorpay_subscription_id: razorpay_subscription_id || undefined,
          razorpay_signature,
          subscriptionId: subscription._id,
          subscriptionName: subscription.name,
          paymentMethod: "razorpay",
          paymentStatus: "completed"
        }
      });
  
      try {
        await transaction.save();
        console.log("✅ Transaction saved successfully:", transaction._id);
      } catch (saveError) {
        console.error("❌ Failed to save transaction:", saveError);
        throw new Error("Failed to save transaction record");
      }
  
      // Update user's subscriptions
      user.subscriptions = user.subscriptions || [];
      user.subscriptions.push({
        subscriptionId: subscription._id,
        subscriptionName: subscription.name,
        purchaseDate: new Date(),
        expiryDate: subscriptionEndDate,
        isActive: true,
        paymentId: razorpay_payment_id,
      });
  
      await user.save();
  
      res.json({
        success: true,
        message: "Subscription activated successfully",
        data: {
          subscription: {
            name: subscription.name,
            expiryDate: subscriptionEndDate,
            features: subscription.features,
          },
          transaction: {
            id: transaction._id,
            amount: transaction.amount,
            date: transaction.createdAt,
          },
        },
      });
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Payment verification failed"
      });
    }
});
// GET /api/subscriptions/user - Get user's active subscriptions
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const user = await User.findById(userId).select('subscriptions');
    
    if (!user || !user.subscriptions) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Filter active subscriptions
    const activeSubscriptions = user.subscriptions.filter(sub => 
      sub.isActive && sub.expiryDate > new Date()
    );

    res.json({
      success: true,
      data: activeSubscriptions
    });

  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user subscriptions'
    });
  }
});
// GET /api/subscriptions/transactions - Get subscription-related transactions
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;

    const transactions = await Transaction.find({
      userId,
      description: { $regex: /subscription/i }
    })
    .sort({ transactionDate: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const totalCount = await Transaction.countDocuments({
      userId,
      description: { $regex: /subscription/i }
    });

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalRecords: totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching subscription transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
});
// POST /api/subscriptions/cancel - Cancel user subscription
router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const userId = req.userId;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID is required'
      });
    }

    const user = await User.findById(userId);
    if (!user || !user.subscriptions) {
      return res.status(404).json({
        success: false,
        message: 'No subscriptions found'
      });
    }

    // Find and deactivate subscription
    const subscription = user.subscriptions.find(
      sub => sub.subscriptionId.toString() === subscriptionId && sub.isActive
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Active subscription not found'
      });
    }

    subscription.isActive = false;
    subscription.cancelledDate = new Date();

    await user.save();

    // Create transaction record for cancellation
    const transaction = new Transaction({
      userId: userId,
      sessionId: null,
      amount: 0,
      type: 'bonus',
      description: `Subscription cancelled: ${subscription.subscriptionName}`
    });

    await transaction.save();

    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
});
module.exports = router;