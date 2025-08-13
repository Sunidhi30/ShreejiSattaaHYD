
// routes/admin.js
const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const mongoose = require('mongoose');
const router = express.Router();
const cloudinary = require("../utils/cloudinary")
const { adminAuth } = require('../middleware/auth');
const Number = require("../models/Number")
const AppSettings = require("../models/AppSettings")
const upload= require("../utils/upload")
const uploadToCloudinary = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'user_profiles' },
          (error, result) => {
            if (error) {
              console.error('Cloudinary Upload Error:', error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        stream.end(fileBuffer);
      });
};
// JWT Authentication Middleware
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
          return res.status(401).json({ message: 'No token provided' });
        }
    
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId);
        
        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }
    
        req.user = user;
        next();
      } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
      }
};
// const upload = require("../utils/upload");
// // === ADMIN SIGNUP ===
router.post('/signup', async (req, res) => {
    try {
      const { username, email, password } = req.body;
  
      if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }
  
      // Check if username or email already exists
      const existingAdmin = await Admin.findOne({
        $or: [{ username }, { email }]
      });
      if (existingAdmin) {
        return res.status(400).json({ message: 'Username or email already exists' });
      }
  
      // Create new admin
      const admin = new Admin({
        username,
        email,
        password,  // Will be hashed by the pre-save middleware
        role: 'admin' // Fixed role
      });
  
      await admin.save();
  
      res.status(201).json({
        message: 'Admin registered successfully',
        admin: {
          id: admin._id,
          username: admin.username,
          email: admin.email
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
});
  // === ADMIN LOGIN ===
router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
  
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
  
      // Find admin by username
      const admin = await Admin.findOne({ username });
      if (!admin) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
  
      // Compare password
      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
  
      // Update last login
      admin.lastLogin = new Date();
      await admin.save();
  
      // Generate JWT Token
      const token = jwt.sign(
        { adminId: admin._id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );
  
      res.status(200).json({
        message: 'Login successful',
        token,
        admin: {
          id: admin._id,
          username: admin.username,
          email: admin.email
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Change Password
router.post('/change-password', adminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const admin = await Admin.findById(req.admin.id);
    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
router.put('/update', adminAuth, upload.single('profileImage'), async (req, res) => {
  try {
    const {
      username,
      email,
      isActive
    } = req.body;

    const admin = req.admin;

    // ✅ Upload profile image to Cloudinary if provided
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      admin.profileImage = result.secure_url; // Save Cloudinary URL
    }

    // ✅ Update other fields
    if (username) admin.username = username;
    if (email) admin.email = email.toLowerCase();
    if (isActive !== undefined) admin.isActive = isActive;

    await admin.save();

    res.status(200).json({
      message: 'Admin profile updated successfully',
      admin
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ message: 'Server error while updating admin', error: error.message });
  }
});
// Admin: Upload/Create Number
router.post('/numbers', adminAuth, async (req, res) => {
  try {
    const { value, title, description } = req.body;
    const number = new Number({
      value,
      title,
      description,
    });

    await number.save();

    res.status(201).json({
      message: 'Number created successfully',
      number
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create number', error: error.message });
  }
});
// Get all numbers
router.get('/numbers', async (req, res) => {
  try {
    const numbers = await Number.find()
      .populate('createdBy', 'name email') // optional: get admin details
      .sort({ createdAt: -1 }); // latest first

    res.status(200).json({
      success: true,
      count: numbers.length,
      numbers
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get numbers', error: error.message });
  }
});
// Admin: Update Number
router.put('/numbers/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { value, title, description, isActive } = req.body;

    const number = await Number.findByIdAndUpdate(
      id,
      { value, title, description, isActive },
      { new: true, runValidators: true }
    );

    if (!number) {
      return res.status(404).json({ message: 'Number not found' });
    }

    res.json({
      message: 'Number updated successfully',
      number
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update number', error: error.message });
  }
});
// Admin: Delete Number
router.delete('/numbers/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const number = await Number.findByIdAndDelete(id);

    if (!number) {
      return res.status(404).json({ message: 'Number not found' });
    }

    res.json({
      message: 'Number deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete number', error: error.message });
  }
});
router.post('/settings/rate',  adminAuth, async (req, res) => {
  try {
    const { ratePerMinute } = req.body;

    let setting = await AppSettings.findOne({ settingName: 'ratePerMinute' });

    if (setting) {
      setting.settingValue = ratePerMinute;
      setting.updatedBy = req.admin.adminId;
    } else {
      setting = new AppSettings({
        settingName: 'ratePerMinute',
        settingValue: ratePerMinute,
        description: 'Rate per minute for user sessions',
        updatedBy: req.admin.adminId
      });
    }

    await setting.save();

    res.json({
      message: 'Rate updated successfully',
      ratePerMinute: setting.settingValue
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update rate', error: error.message });
  }
});
// Admin: Get All Users
router.get('/all-users',  adminAuth, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Users retrieved successfully',
      users
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve users', error: error.message });
  }
});
// Admin: Get User Sessions
router.get('/admin/users/:userId/sessions',  adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const sessions = await UserSession.find({ userId })
      .populate('userId', 'username email')
      .sort({ createdAt: -1 });

    res.json({
      message: 'User sessions retrieved successfully',
      sessions
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve sessions', error: error.message });
  }
});
// // router.get('/admin-earnings',adminAuth, async (req, res) => {
// //   try {
// //     // ✅ Sum all bet amounts from Bet collection
// //     const totalBets = await Bet.aggregate([
// //       { $group: { _id: null, totalAmount: { $sum: "$betAmount" } } }
// //     ]);
// //     const normalBetsTotal = totalBets[0]?.totalAmount || 0;

// //     // ✅ Sum all bet amounts from HardGame collection
// //     const totalHardBets = await HardGame.aggregate([
// //       { $group: { _id: null, totalAmount: { $sum: "$betAmount" } } }
// //     ]);
// //     const hardGameBetsTotal = totalHardBets[0]?.totalAmount || 0;

// //     // ✅ Combine both totals
// //     const totalUserInvestments = normalBetsTotal + hardGameBetsTotal;

// //     // ✅ Get admin earnings
// //     const admin = await Admin.findOne();
// //     const adminEarnings = admin ? admin.earnings : 0;

// //     // ✅ Send response
// //     res.status(200).json({
// //       message: "Summary retrieved successfully",
// //       totalUserInvestments,
// //       adminEarnings
// //     });
// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).json({ message: "Failed to fetch summary" });
// //   }
// // });
// router.get('/profiles', async (req, res) => {
//   try {
//     const admins = await Admin.find().select('-password'); // exclude password
//     res.status(200).json({
//       message: 'Admin profiles fetched successfully',
//       data: admins
//     });
//   } catch (error) {
//     console.error('Error fetching admin profiles:', error);
//     res.status(500).json({
//       message: 'Server error while fetching admin profiles',
//       error: error.message
//     });
//   }
// });
// //Route: Get total user count
router.get('/users-count', async (req, res) => {
    try {
      const userCount = await User.countDocuments();
      res.json({
        message: 'User count retrieved successfully',
        count: userCount
      });
    } catch (error) {
      console.error('Error fetching user count:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// // Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'registrationDate', order = 'desc' } = req.query;
    
    const query = search ? {
      $or: [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const users = await User.find(query)
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-password');

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// // Get user details
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('referredBy', 'username');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's betting history
    const bets = await Bet.find({ userId: user._id })
      .populate('gameId', 'name')
      .sort({ date: -1 })
      .limit(10);

    // Get user's transaction history
    const transactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      user,
      recentBets: bets,
      recentTransactions: transactions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// // Block/Unblock user
router.patch('/users/:id/block', adminAuth, async (req, res) => {
  try {
    const { isBlocked } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// // Add/Update game rate
router.delete('/user/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// // 7. TRANSACTION MANAGEMENT
// // Get withdrawal requests
router.get('/withdrawals', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'pending' } = req.query;
    
    const withdrawals = await Transaction.find({
      type: 'withdrawal',
      status
    })
      .populate('userId', 'username mobile email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments({
      type: 'withdrawal',
      status
    });

    res.json({
      success: true,
      withdrawals,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// // Process withdrawal
// router.patch('/withdrawals/:id', adminAuth, async (req, res) => {
//   try {
//     const { status, adminNotes } = req.body;
    
//     const withdrawal = await Transaction.findById(req.params.id)
//       .populate('userId');

//     if (!withdrawal) {
//       return res.status(404).json({ message: 'Withdrawal not found' });
//     }

//     withdrawal.status = status;
//     withdrawal.adminNotes = adminNotes;
//     withdrawal.processedAt = new Date();
//     await withdrawal.save();

//     // If rejected, return money to user balance
//     if (status === 'rejected') {
//       await User.findByIdAndUpdate(withdrawal.userId._id, {
//         $inc: { balance: withdrawal.amount }
//       });
//     }

//     res.json({
//       success: true,
//       message: `Withdrawal ${status} successfully`,
//       withdrawal
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
// // Bet report
// router.get('/reports/bets', adminAuth, async (req, res) => {
//   try {
//     const { startDate, endDate, gameId } = req.query;
    
//     let query = {};
//     if (startDate && endDate) {
//       query.date = {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate)
//       };
//     }
//     if (gameId) {
//       query.gameId = gameId;
//     }

//     const report = await Bet.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: {
//             gameId: '$gameId',
//             date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }
//           },
//           totalBets: { $sum: 1 },
//           totalAmount: { $sum: '$amount' },
//           totalWinAmount: { $sum: '$winAmount' },
//           uniqueUsers: { $addToSet: '$userId' }
//         }
//       },
//       {
//         $lookup: {
//           from: 'games',
//           localField: '_id.gameId',
//           foreignField: '_id',
//           as: 'game'
//         }
//       },
//       { $sort: { '_id.date': -1 } }
//     ]);

//     res.json({
//       success: true,
//       report
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
// // User report
// router.get('/reports/users', adminAuth, async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;
    
//     let query = {};
//     if (startDate && endDate) {
//       query.registrationDate = {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate)
//       };
//     }

//     const totalUsers = await User.countDocuments(query);
//     const activeUsers = await User.countDocuments({ ...query, isActive: true });
//     const blockedUsers = await User.countDocuments({ ...query, isBlocked: true });

//     const userStats = await User.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: null,
//           totalBalance: { $sum: '$balance' },
//           totalDeposits: { $sum: '$totalDeposits' },
//           totalWithdrawals: { $sum: '$totalWithdrawals' },
//           totalWinnings: { $sum: '$totalWinnings' }
//         }
//       }
//     ]);

//     res.json({
//       success: true,
//       report: {
//         totalUsers,
//         activeUsers,
//         blockedUsers,
//         stats: userStats[0] || {
//           totalBalance: 0,
//           totalDeposits: 0,
//           totalWithdrawals: 0,
//           totalWinnings: 0
//         }
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
// // GET /games/:gameId/investors
// router.get('/testing/:gameId/investors', async (req, res) => {
//   try {
//     const { gameId } = req.params;

//     // Find all bets for the specified game and populate user details
//     const bets = await Bet.find({ game: gameId })
//       .populate('user', 'username email profileImage')
//       .sort({ createdAt: -1 });

//     const userMap = new Map();

//     bets.forEach(bet => {
//       const userId = bet.user._id.toString();

//       if (!userMap.has(userId)) {
//         userMap.set(userId, {
//           userId: bet.user._id,
//           username: bet.user.username,
//           email: bet.user.email,
//           profileImage: bet.user.profileImage,
//           totalBetAmount: 0,
//           betHistory: []
//         });
//       }

//       const userEntry = userMap.get(userId);
//       userEntry.totalBetAmount += bet.totalBetAmount; // ✅ FIXED HERE

//       userEntry.betHistory.push({
//         betNumbers: bet.betNumbers,               // ✅ Include full bet numbers with amounts
//         totalBetAmount: bet.totalBetAmount,       // ✅ Include total
//         betType: bet.betType,
//         session: bet.session,
//         status: bet.status,
//         createdAt: bet.createdAt
//       });
//     });

//     const investors = Array.from(userMap.values());

//     return res.status(200).json({
//       success: true,
//       gameId,
//       totalInvestors: investors.length,
//       investors
//     });
//   } catch (error) {
//     console.error('Error fetching investors:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Something went wrong. Please try again later.'
//     });
//   }
// });



// // 9. TRANSACTION MANAGEMENT
// router.get('/transactions/pending',  adminAuth, async (req, res) => {
//   try {
//     const transactions = await Transaction.find({ status: 'pending' })
//       .populate('user', 'username email')
//       .sort({ createdAt: -1 });

//     res.json({
//       message: 'Pending transactions retrieved successfully',
//       transactions
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
// router.post('/transactions/:transactionId/action', adminAuth, async (req, res) => {
//   try {
//     const { transactionId } = req.params;
//     const { action, adminNotes } = req.body;

//     const transaction = await Transaction.findById(transactionId);
//     if (!transaction) {
//       return res.status(404).json({ message: 'Transaction not found' });
//     }

//     if (transaction.status !== 'pending' && transaction.status !== 'admin_pending') {
//       return res.status(400).json({ message: 'Transaction is not pending' });
//     }

//     // Process based on admin's action
//    // inside the approve block
// if (action === 'approve') {
//   transaction.status = 'completed';
//   transaction.adminNotes = adminNotes;
//   transaction.processedAt = new Date();
//   transaction.processedBy = req.admin._id;

//   // Update user wallet
//   const user = await User.findById(transaction.user);
//   if (!user) {
//     return res.status(404).json({ message: 'User not found' });
//   }

//   if (transaction.type === 'deposit') {
//     user.wallet.balance += transaction.amount;
//     user.wallet.totalDeposits += transaction.amount;

//     console.log(`Deposited ₹${transaction.amount} to ${user.username || user.email}`);
//     console.log(`Updated wallet balance: ₹${user.wallet.balance}`);

//     // Check if user was referred by someone
//     if (user.referredBy) {
//       const referrer = await User.findById(user.referredBy);
//       if (referrer) {
//         const bonusAmount = Math.floor(transaction.amount * 0.05); // 5% referral bonus
//         console.log(`User ${user.username || user.email} was referred by ${referrer.username || referrer.email}`);
//         console.log(`Referral Bonus Calculated: ₹${bonusAmount}`);

//         if (bonusAmount > 0) {
//           referrer.referralEarnings += bonusAmount;
//           referrer.wallet.commission += bonusAmount;

//           console.log(`Before saving: ${referrer.username || referrer.email} had ₹${referrer.wallet.commission - bonusAmount} commission`);
//           console.log(`After saving: ${referrer.username || referrer.email} will have ₹${referrer.wallet.commission} commission`);
          
//           await referrer.save();

//           // Log referral bonus transaction
//           const referralTransaction = new Transaction({
//             user: referrer._id,
//             type: 'referral',
//             amount: bonusAmount,
//             paymentMethod: 'wallet',
//             description: `5% referral commission from ${user.username || user.email}'s deposit`,
//             status: 'completed',
//             processedAt: new Date()
//           });

//           await referralTransaction.save();
//           console.log(`Referral transaction saved: ₹${bonusAmount} to ${referrer.username || referrer.email}`);
//         }
//       } else {
//         console.log(`ReferredBy ID not found: ${user.referredBy}`);
//       }
//     }
//   }

//   await user.save();
//     } else if (action === 'reject') {
//       transaction.status = 'failed';
//       transaction.adminNotes = adminNotes;
//       transaction.processedAt = new Date();
//       transaction.processedBy = req.admin._id;
//     } else {
//       return res.status(400).json({ message: "Invalid action. Must be 'approve' or 'reject'." });
//     }

//     await transaction.save();

//     res.json({
//       message: `Transaction ${action}ed successfully`,
//       transaction: {
//         id: transaction._id,
//         status: transaction.status,
//         processedAt: transaction.processedAt
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
// //Get transaction statistics
// router.get('/transactions/stats',adminAuth, async (req, res) => {
//   try {
//     const stats = await Transaction.aggregate([
//       {
//         $group: {
//           _id: '$status',
//           count: { $sum: 1 },
//           totalAmount: { $sum: '$amount' }
//         }
//       }
//     ]);

//     res.json({
//       message: 'Transaction statistics retrieved successfully',
//       stats
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
// // GET /admin/withdrawals
// router.get('/users-withdrawals', adminAuth, async (req, res) => {
//   try {
//     // 🔥 Only fetch withdrawals that are pending admin approval
//     const withdrawals = await Transaction.find({ status: 'admin_pending' })
//       .populate('user', 'username email wallet')
//       .sort({ createdAt: -1 }); // Most recent first

//     res.status(200).json({
//       message: 'Pending withdrawals fetched successfully',
//       withdrawals
//     });
//   } catch (error) {
//     console.error('Fetch pending withdrawals error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
// // POST /admin/withdrawals/:id/approve
// router.post('/users-withdrawalstesting/:id/approve', adminAuth, async (req, res) => {
//   try {
//     const { id } = req.params;
   

//     // ✅ Find transaction
//     const transaction = await Transaction.findById(id).populate('user');
//     if (!transaction) {
//       return res.status(404).json({ message: 'Transaction not found' });
//     }


//     // ✅ Check if user exists
//     const user = transaction.user;
  

//     if (!user) {
//       return res.status(404).json({ message: 'User linked to this transaction does not exist' });
//     }
//     if (transaction.status !== 'pending' && transaction.status !== 'admin_pending') {
//       return res.status(400).json({ message: 'Transaction is not pending approval' });
//     }
    

//     // ✅ Check user balance
//     if (user.wallet.balance < transaction.amount) {
//       return res.status(400).json({ message: 'User has insufficient balance' });
//     }

//     // ✅ Deduct balance
//     user.wallet.balance -= transaction.amount;
//     user.wallet.totalWithdrawals += transaction.amount;
//     await user.save();

//     // ✅ Update transaction
//     transaction.status = 'completed';
//     transaction.processedAt = new Date();
//     transaction.processedBy = req.admin._id;
//     await transaction.save();

//     res.status(200).json({ message: 'Withdrawal approved successfully' });
//   } catch (error) {
//     console.error('Approve withdrawal error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
// // POST /admin/withdrawals/:id/reject
// router.post('/users-withdrawals/:id/reject', adminAuth, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { reason } = req.body; // Optional rejection reason

//     // ✅ Find transaction
//     const transaction = await Transaction.findById(id);
//     if (!transaction) {
//       return res.status(404).json({ message: 'Transaction not found' });
//     }
//     if (transaction.status !== 'admin_pending') {
//       return res.status(400).json({ message: 'Transaction is not pending approval' });
//     }

//     // ✅ Update transaction
//     transaction.status = 'cancelled';
//     transaction.adminNotes = reason || 'Rejected by admin';
//     transaction.processedAt = new Date();
//     transaction.processedBy = req.admin._id;
//     await transaction.save();

//     res.status(200).json({ message: 'Withdrawal request rejected successfully' });
//   } catch (error) {
//     console.error('Reject withdrawal error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
// // GET /admin/withdrawals/approved
// router.get('/users-withdrawals/approved', adminAuth, async (req, res) => {
//   try {
//     // 🔥 Fetch withdrawals approved by admin
//     const approvedWithdrawals = await Transaction.find({ status: 'completed' })
//       .populate('user', 'username email wallet')
//       .sort({ processedAt: -1 }); // Most recent first

//     res.status(200).json({
//       message: 'Approved withdrawals fetched successfully',
//       withdrawals: approvedWithdrawals
//     });
//   } catch (error) {
//     console.error('Fetch approved withdrawals error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
// // GET /admin/withdrawals
// router.get('/users-withdrawals-testing', adminAuth, async (req, res) => {
//   try {
//     const { status } = req.query; // 🔥 Filter by status if provided

//     let query = { type: 'withdrawal' }; // Only withdrawals

//     if (status) {
//       // If status is passed (e.g., ?status=completed)
//       query.status = status;
//     }

//     const withdrawals = await Transaction.find(query)
//       .populate('user', 'username email wallet')
//       .sort({ createdAt: -1 }); // Most recent first

//     res.status(200).json({
//       message: 'Withdrawals fetched successfully',
//       withdrawals
//     });
//   } catch (error) {
//     console.error('Fetch withdrawals error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
// //deposits of the users
// router.get('/testing-transactions/deposits', async (req, res) => {
//   try {
//     const { status } = req.query;

//     // Build filter
//     let filter = { type: 'deposit' };

//     if (status) {
//       const statusMap = {
//         rejected: 'failed',
//         approved: 'completed',
//         pending: ['pending', 'admin_pending'], // include admin_pending as pending
//       };

//       const normalizedStatus = statusMap[status.toLowerCase()] || status.toLowerCase();

//       filter.status = normalizedStatus;
//     }

//     // Fetch transactions
//     const transactions = await Transaction.find(filter)
//       .populate('user', 'username email profileImage')
//       .sort({ createdAt: -1 })
//       .lean(); // Get plain JS objects to modify

//     // Normalize admin_pending → pending
//     transactions.forEach(txn => {
//       if (txn.status === 'admin_pending') {
//         txn.status = 'pending';
//       }
//     });

//     res.status(200).json({
//       success: true,
//       count: transactions.length,
//       message: 'Deposit transactions retrieved successfully',
//       transactions,
//     });
//   } catch (error) {
//     console.error('Error fetching deposit transactions:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch deposit transactions',
//       error: error.message,
//     });
//   }
// });
// // ✅ Create a new notice
// router.post('/notices', adminAuth, async (req, res) => {
//   try {
//     const { title, description } = req.body;
//     const adminId = req.admin._id; // Admin ID from auth middleware

//     const newNotice = new Notice({
//       title,
//       description,
//       createdBy: adminId
//     });

//     await newNotice.save();

//     res.status(201).json({
//       message: 'Notice created successfully',
//       notice: newNotice
//     });
//   } catch (err) {
//     console.error('Create Notice Error:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });
// // ✅ Get all notices (latest first)
// router.get('/notices', adminAuth, async (req, res) => {
//   try {
//     const notices = await Notice.find()
//       .populate('createdBy', 'username email')
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       message: 'Notices retrieved successfully',
//       notices
//     });
//   } catch (err) {
//     console.error('Get Notices Error:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });
// // ✅ Update a notice
// router.put('/notices/:id', adminAuth, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { title, description } = req.body;

//     const updatedNotice = await Notice.findByIdAndUpdate(
//       id,
//       { title, description },
//       { new: true, runValidators: true }
//     );

//     if (!updatedNotice) {
//       return res.status(404).json({ message: 'Notice not found' });
//     }

//     res.status(200).json({
//       message: 'Notice updated successfully',
//       notice: updatedNotice
//     });
//   } catch (err) {
//     console.error('Update Notice Error:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });
// // ✅ Delete a notice
// router.delete('/notices/:id', adminAuth, async (req, res) => {
//   try {
//     const { id } = req.params;

//     const deletedNotice = await Notice.findByIdAndDelete(id);

//     if (!deletedNotice) {
//       return res.status(404).json({ message: 'Notice not found' });
//     }

//     res.status(200).json({
//       message: 'Notice deleted successfully'
//     });
//   } catch (err) {
//     console.error('Delete Notice Error:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });
// // GET admin payment details
// router.get('/admins-settings', async (req, res) => {
//   try {
//     const settings = await AdminSettings.findOne({});
//     if (!settings) {
//       return res.status(404).json({ message: 'Admin settings not found' });
//     }

//     res.status(200).json({
//       message: 'Admin settings fetched successfully',
//       data: {
//         adminPaymentDetails: settings.adminPaymentDetails,
//         minimumDeposit: settings.minimumDeposit,
//         minimumWithdrawal: settings.minimumWithdrawal,
//         withdrawalTimings: settings.withdrawalTimings,
//         paymentInstructions: settings.paymentInstructions,
//         autoApproval: settings.autoApproval
//       }
//     });
//   } catch (error) {
//     console.error('Error fetching admin settings:', error);
//     res.status(500).json({ message: 'Server error while fetching admin settings' });
//   }
// });
// // Get All Transactions (Deposits & Withdrawals) for Admin
// router.get('/wallet/admin/transactions', adminAuth, async (req, res) => {
//   try {
//     const { page = 1, limit = 10, status, type, userId } = req.query;

//     const filter = {};
//     if (status) filter.status = status;
//     if (type) filter.type = type;
//     if (userId) filter.user = userId;

//     const transactions = await Transaction.find(filter)
//       .populate('user', 'username email')
//       .populate('processedBy', 'username email')
//       .sort({ createdAt: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit);

//     const total = await Transaction.countDocuments(filter);

//     res.json({
//       message: 'Transactions retrieved successfully',
//       transactions,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total,
//         pages: Math.ceil(total / limit)
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
// // Get Single Transaction Details for Admin
// router.get('/wallet/admin/transaction/:id',adminAuth, async (req, res) => {
//   try {
//     const transaction = await Transaction.findById(req.params.id)
//     .populate('user', 'username email wallet depositScreenshots') // include screenshots
//     .populate('processedBy', 'username email');

//     if (!transaction) {
//       return res.status(404).json({ message: 'Transaction not found' });
//     }

//     res.json({
//       message: 'Transaction details retrieved successfully',
//       transaction
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
// // Approve Transaction (Deposit/Withdrawal)(working fine)
// router.post('/wallet/admin/approve/:id', adminAuth, async (req, res) => {
//   try {
//     const { adminNotes } = req.body;
//     const transactionId = req.params.id;

//     const transaction = await Transaction.findById(transactionId).populate('user');
    
//     if (!transaction) {
//       return res.status(404).json({ message: 'Transaction not found' });
//     }

//     if (transaction.status !== 'admin_pending') {
//       return res.status(400).json({ message: 'Transaction cannot be approved' });
//     }

//     const user = await User.findById(transaction.user._id);

//     if (transaction.type === 'deposit') {
//       // Add money to user's wallet
//       user.wallet.balance += transaction.amount;
//       user.wallet.totalDeposits += transaction.amount;

//       // Add to admin earnings
//       const admin = await Admin.findById(req.admin._id);
//       if (admin) {
//         admin.earnings += transaction.amount;
//         await admin.save();
//       }
//     } else if (transaction.type === 'withdrawal') {
//       // Deduct money from user's wallet
//       if (user.wallet.balance < transaction.amount) {
//         return res.status(400).json({ message: 'User has insufficient balance' });
//       }
//       user.wallet.balance -= transaction.amount;
//       user.wallet.totalWithdrawals += transaction.amount;
//     }

//     // Update transaction
//     transaction.status = 'completed';
//     transaction.adminNotes = adminNotes || '';
//     transaction.processedAt = new Date();
//     transaction.processedBy = req.admin._id;

//     await Promise.all([
//       user.save(),
//       transaction.save()
//     ]);

//     res.json({
//       message: `${transaction.type} approved successfully`,
//       transaction: {
//         id: transaction._id,
//         type: transaction.type,
//         amount: transaction.amount,
//         status: transaction.status,
//         user: {
//           username: user.username,
//           newBalance: user.wallet.balance
//         }
//       }
//     });
//   } catch (error) {
//     console.error('Error approving transaction:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
// // Reject Transaction
// router.post('/wallet/admin/reject/:id', adminAuth, async (req, res) => {
//   try {
//     const { adminNotes } = req.body;
//     const transactionId = req.params.id;

//     const transaction = await Transaction.findById(transactionId).populate('user');
    
//     if (!transaction) {
//       return res.status(404).json({ message: 'Transaction not found' });
//     }

//     if (transaction.status !== 'admin_pending') {
//       return res.status(400).json({ message: 'Transaction cannot be rejected' });
//     }

//     // Update transaction
//     transaction.status = 'cancelled';
//     transaction.adminNotes = adminNotes || 'Rejected by admin';
//     transaction.processedAt = new Date();
//     transaction.processedBy = req.admin._id;

//     await transaction.save();

//     res.json({
//       message: `${transaction.type} rejected successfully`,
//       transaction: {
//         id: transaction._id,
//         type: transaction.type,
//         amount: transaction.amount,
//         status: transaction.status,
//         adminNotes: transaction.adminNotes
//       }
//     });
//   } catch (error) {
//     console.error('Error rejecting transaction:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
// // Get all withdrawal transactions (for Admin)
// router.get('/wallet/admin/withdrawals', adminAuth, async (req, res) => {
//   try {
//     const { page = 1, limit = 10, status, userId } = req.query;

//     // Filter for only withdrawal type
//     const filter = { type: 'withdrawal' };
//     if (status) filter.status = status;
//     if (userId) filter.user = userId;

//     const withdrawals = await Transaction.find(filter)
//       .populate('user', 'username email')
//       .populate('processedBy', 'username email')
//       .sort({ createdAt: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit);

//     const total = await Transaction.countDocuments(filter);

//     res.json({
//       message: 'Withdrawal transactions retrieved successfully',
//       withdrawals,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total,
//         pages: Math.ceil(total / limit)
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
module.exports = router;
