const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Admin = require('../models/Admin');
const upload= require("../utils/upload")
const cloudinary = require("../utils/cloudinary")
const mongoose = require('mongoose');
const Notice = require("../models/Notice");
const Number = require("../models/Number")
const moment = require('moment-timezone');
const streamifier = require('streamifier');
require('dotenv').config()

// JWT Authentication Middleware
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
          return res.status(401).json({ message: 'No token provided' });
        }
    
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Apple');
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
// Update User Details API (with profile image upload)
router.put('/update',  authMiddleware , upload.single('profileImage'), async (req, res) => {
  try {
    const userId =req.user._id
    const {
      username,
      email,
      mobile,
      password,
      paymentDetails
    } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
 // ✅ Check if new username already exists (and not same user)
 if (username && username !== user.username) {
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ message: 'Username already taken' });
  }
  user.username = username;
}
    // ✅ Upload profile image to Cloudinary if provided
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      user.profileImage = result.secure_url; // Save Cloudinary URL
    }

    // ✅ Update other fields
    if (username) user.username = username;
    if (email) user.email = email;
    if (mobile) user.mobile = mobile;

    if (paymentDetails) {
      user.paymentDetails = {
        ...user.paymentDetails,
        ...paymentDetails
      };
    }

    // ✅ If password is provided, hash it
    if (password && password.length >= 6) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    await user.save();

    res.status(200).json({ message: 'User details updated successfully', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error while updating user' });
  }
});
// get numbers uploaded by the admin
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
// // Get Today's Lucky Number
// router.get('/testing-today-number', authMiddleware, async (req, res) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const todayResult = await Result.findOne({
//       date: { $gte: today }
//     }).populate('gameId').sort({ declaredAt: -1 });

//     if (!todayResult) {
//       return res.json({
//         message: 'No result declared for today yet',
//         luckyNumber: null,
//         nextResultTime: null
//       });
//     }

//     res.json({
//       message: 'Today\'s lucky number retrieved',
//       luckyNumber: todayResult.openResult || todayResult.closeResult,
//       game: todayResult.gameId.name,
//       declaredAt: todayResult.declaredAt
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
router.get('/today-number', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayResult = await Result.findOne({
      date: { $gte: today },
      status: 'published' // optional filter if you want only published ones
    }).populate('gameId').sort({ declaredAt: -1 });

    if (!todayResult) {
      return res.json({
        message: 'No result declared for today yet',
        luckyNumber: null,
        nextResultTime: null
      });
    }

    const resultTime = todayResult.scheduledPublishTime || todayResult.gameId?.resultDateTime;

    if (!resultTime || now < resultTime) {
      return res.json({
        message: 'Result not declared yet',
        luckyNumber: null,
        game: todayResult.gameId?.name,
        resultWillBeDeclaredAt: resultTime
      });
    }

    res.json({
      message: 'Today\'s lucky number retrieved',
      luckyNumber: todayResult.openResult || todayResult.closeResult,
      game: todayResult.gameId.name,
      declaredAt: todayResult.declaredAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// Get User Profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    // Get user statistics
    const totalBets = await Bet.countDocuments({ user: req.user._id });
    const totalWins = await Bet.countDocuments({ 
      user: req.user._id, 
      status: 'won' 
    });
    const totalHardGames = await HardGame.countDocuments({ user: req.user._id });

    res.json({
      message: 'Profile retrieved successfully',
      user,
      statistics: {
        totalBets,
        totalWins,
        totalHardGames,
        winPercentage: totalBets > 0 ? ((totalWins / totalBets) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// Update Profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, mobile, paymentDetails } = req.body;

    const updateData = {};
    if (username) updateData.username = username;
    if (mobile) updateData.mobile = mobile;
    if (paymentDetails) updateData.paymentDetails = paymentDetails;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// Get Referral Details
router.get('/referral', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Get referred users
    const referredUsers = await User.find({ 
      referredBy: req.user._id 
    }).select('username email mobile createdAt');

    // Get referral transactions
    const referralTransactions = await Transaction.find({
      user: req.user._id,
      type: 'referral'
    }).sort({ createdAt: -1 });

    res.json({
      message: 'Referral details retrieved successfully',
      referralCode: user.referralCode,
      referralEarnings: user.referralEarnings,
      referredUsers,
      referralTransactions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// Get App Settings
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const settings = await Settings.findOne({});
    
    res.json({
      message: 'Settings retrieved successfully',
      settings: {
        withdrawalTimings: settings?.withdrawalTimings,
        minimumDeposit: settings?.minimumDeposit || 100,
        minimumWithdrawal: settings?.minimumWithdrawal || 500,
        referralCommission: settings?.referralCommission || 5
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// POST /wallet/withdraw
router.post('/wallet/withdraw', authMiddleware, async (req, res) => {
  try {
    const { 
      amount, 
      paymentMethod, 
      accountNumber, 
      ifscCode, 
      accountHolderName, 
      upiId, 
      mobileNumber 
    } = req.body;

    // ✅ Validate required fields
    if (!amount || !paymentMethod || (!accountNumber && !upiId)) {
      return res.status(400).json({ message: 'All payment details are required' });
    }

    const settings = await Settings.findOne({});
    const minWithdrawal = settings?.minimumWithdrawal || 500;

    // ✅ Minimum amount check
    if (amount < minWithdrawal) {
      return res.status(400).json({
        message: `Minimum withdrawal amount is ${minWithdrawal}`
      });
    }

    // ✅ Check user balance
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // ✅ Create withdrawal transaction
    const transaction = new Transaction({
      user: req.user._id,
      type: 'withdrawal',
      amount,
      paymentMethod,
      paymentDetails: {
        accountNumber,
        ifscCode,
        accountHolderName,
        upiId,
        mobileNumber
      },
      description: `Withdrawal via ${paymentMethod}`,
      status: 'admin_pending' // 🟡 waiting for admin approval
    });

    await transaction.save();

    res.status(200).json({
      message: 'Withdrawal request sent to admin for approval',
      transaction: {
        id: transaction._id,
        amount,
        status: transaction.status,
        paymentMethod,
        paymentDetails: transaction.paymentDetails
      }
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// GET /api/games/declared
// router.get('/games-test/declared', async (req, res) => {
//   try {
//     // Find all results where declaredAt exists (results declared)
//     const declaredResults = await Result.find({ declaredAt: { $ne: null } })
//       .populate('gameId', 'name openTime closeTime resultTime currentResult') // populate game details
//       .sort({ declaredAt: -1 }); // latest first

//     // Map through results to add winners count
//     const gamesWithWinners = await Promise.all(
//       declaredResults.map(async (result) => {
//         // Count winners for this gameId and result
//         const winnerCount = await GameWin.countDocuments({
//           gameId: result.gameId._id,
//           resultId: result._id
//         });

//         return {
//           gameName: result.gameId.name,
//           luckyNumber: result.openResult || result.closeResult || result.spinnerResult,
//           openTime: result.gameId.openTime,
//           closeTime: result.gameId.closeTime,
//           resultTime: result.gameId.resultTime,
//           declaredAt: result.declaredAt,
//           totalWinners: winnerCount
//         };
//       })
//     );

//     res.status(200).json({
//       success: true,
//       count: gamesWithWinners.length,
//       data: gamesWithWinners
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch declared games',
//       error: error.message
//     });
//   }
// });
// ✅ Get all notices (latest first)
router.get('/notices', async (req, res) => {
  try {
    const notices = await Notice.find()
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Notices retrieved successfully',
      notices
    });
  } catch (err) {
    console.error('Get Notices Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
// GET /transactions?type=deposit OR ?type=withdrawal
router.get('/transactions-based', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id; // ✅ get user ID from token
    const { type } = req.query;  // ✅ type can be: deposit, withdrawal, bet, win, etc.

    const filter = { user: userId };
    
    if (type) {
      filter.type = type;
    }

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Transactions fetched successfully',
      transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});
// Optional: Add a route to check potential referral bonus
router.get('/referral/bonus-preview/:referralCode', async (req, res) => {
  try {
    const { referralCode } = req.params;
    
    const referrer = await User.findOne({ referralCode });
    if (!referrer) {
      return res.status(404).json({ message: 'Invalid referral code' });
    }

    const potentialBonus = Math.floor(referrer.wallet.totalDeposits * 0.05);
    
    res.json({
      message: 'Referral bonus preview',
      referrerUsername: referrer.username || referrer.email,
      referrerTotalDeposits: referrer.wallet.totalDeposits,
      potentialBonus: potentialBonus,
      bonusPercentage: 5
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// GET /api/users/referral-code
router.get('/referral-code',  authMiddleware, async (req, res) => {
  try {
    const referralCode = req.user.referralCode;
    res.json({ referralCode });
  } catch (err) {
    res.status(500).json({ message: 'Server error while fetching referral code' });
  }
});
// Get Wallet Details
router.get('/user-tests-wallet', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Get recent transactions
    const recentTransactions = await Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      message: 'Wallet details retrieved successfully',
      wallet: user.wallet,
      recentTransactions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
//manual deposits 
router.post('/wallet/manual-deposit', authMiddleware, upload.single('paymentScreenshot'), async (req, res) => {
  try {
    const { amount, utrId, paymentMethod, remarks } = req.body;

    if (!amount || !utrId || !paymentMethod || !req.file) {
      return res.status(400).json({ 
        message: 'Amount, UTR ID, payment method and payment screenshot are required' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const settings = await AdminSetting.findOne({});
    const minDeposit = settings?.minimumDeposit || 100;

    if (amount < minDeposit) {
      return res.status(400).json({ 
        message: `Minimum deposit amount is ${minDeposit}` 
      });
    }

    // Check if UTR ID already exists
    const existingTransaction = await Transaction.findOne({
      'paymentDetails.transactionId': utrId,
      type: 'deposit'
    });

    if (existingTransaction) {
      return res.status(400).json({ 
        message: 'This UTR ID has already been used' 
      });
    }

    // Upload image to Cloudinary
    const cloudResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'manual_deposits' },
        (error, result) => {
          if (result) resolve(result);
          else reject(error);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    const transaction = new Transaction({
      user: req.user._id,
      type: 'deposit',
      amount: parseFloat(amount),
      paymentMethod: paymentMethod,
      paymentDetails: {
        transactionId: utrId,
        remarks: remarks || ''
      },
      paymentScreenshot: {
        url: cloudResult.secure_url
      },
      description: `Manual deposit via ${paymentMethod}`,
      status: 'admin_pending'
    });
    

    await transaction.save();

    // // ✅ Push screenshot into user model
    // await User.findByIdAndUpdate(req.user._id, {
    //   $push: {
    //     depositScreenshots: {
    //       url: cloudResult.secure_url,
    //       transactionId: utrId
    //     }
    //   }
    // });

    res.json({
      message: 'Deposit request submitted successfully. Please wait for admin approval.',
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        status: transaction.status,
        utrId: utrId
      }
    });

  } catch (error) {
    console.error('Error creating manual deposit:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
router.post('/wallet/manual-withdraw', authMiddleware, upload.single('paymentScreenshot'), async (req, res) => {
  try {
    const { amount, paymentMethod, accountDetails, remarks } = req.body;

    if (!amount || !paymentMethod || !accountDetails || !req.file) {
      return res.status(400).json({
        message: 'Amount, payment method, account details, and payment screenshot are required'
      });
    }

    const account = JSON.parse(accountDetails);

    // Wrap upload_stream in a Promise
    const uploadToCloudinary = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({
          resource_type: 'image',
          folder: 'manual_withdrawals',
        }, (error, result) => {
          if (error) return reject(error);
          resolve(result);
        });

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const result = await uploadToCloudinary();

    const transaction = new Transaction({
      user: req.user._id,
      type: 'withdrawal',
      amount,
      status: 'admin_pending', // 🟡 waiting for admin approval
      paymentMethod,
      description: remarks || 'Manual withdrawal request',
      paymentDetails: {
        mobileNumber: account.mobileNumber,
        accountNumber: account.accountNumber,
        ifscCode: account.ifscCode,
        accountHolderName: account.accountHolderName,
        upiId: account.upiId,
        transactionId: account.transactionId,
        reference: account.reference
      },
      paymentScreenshot: {
        url: result.secure_url
      }
    });

    await transaction.save();

    return res.status(200).json({ message: 'Withdrawal request submitted successfully', transaction });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// Get Transaction History for User
router.get('/wallet/transactions', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;

    const filter = { user: req.user._id };
    if (type) {
      filter.type = type;
    }

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(filter);

    res.json({
      message: 'Transaction history retrieved successfully',
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
//admin details
router.get('/Admin-details', async (req, res) => {
  try {
    let settings = await ASettings.findOne({});
    if (!settings) {
      settings = new ASettings({});
      await settings.save();
    }

    res.json({ message: 'Settings retrieved successfully', settings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
module.exports = router;
