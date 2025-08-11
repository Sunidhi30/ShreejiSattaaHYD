const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Number = require('../models/Number');
const UserSession = require('../models/UserSession');
const AppSettings = require('../models/AppSettings');
const Transaction = require('../models/Transaction');
const  Admin = require("")
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'Apple';

// Middleware for authentication
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Middleware for admin authentication
const authenticateAdmin = async (req, res, next) => {
        try {
          const token = req.header('Authorization')?.replace('Bearer ', '');
          if (!token) {
            return res.status(401).json({ message: 'No token provided' });
          }
      
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
          // 🛠 Use the correct key here
          const admin = await Admin.findById(decoded.adminId);
      
          if (!admin || !admin.isActive) {
            return res.status(401).json({ message: 'Invalid admin token' });
          }
      
          req.admin = admin;
          next();
        } catch (error) {
          console.error("Token verification failed:", error);
          res.status(401).json({ message: 'Invalid token' });
        }
      };
      

// ==================== AUTH ROUTES ====================

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await User.findOne({ 
      username: username.toLowerCase(),
      role: 'admin' 
    });

    if (!admin) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Admin login successful',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User Registration
router.post('/user/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      role: 'user'
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        totalMoney: user.totalMoney
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// User Login
router.post('/user/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ 
      username: username.toLowerCase(),
      role: 'user'
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create user session
    const ratePerMinute = await AppSettings.findOne({ settingName: 'ratePerMinute' });
    const rate = ratePerMinute ? ratePerMinute.settingValue : 1;

    const session = new UserSession({
      userId: user._id,
      loginTime: new Date(),
      ratePerMinute: rate,
      isActive: true
    });

    await session.save();

    // Update user status
    user.currentSession.loginTime = new Date();
    user.currentSession.isOnline = true;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role, sessionId: session._id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      sessionId: session._id,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        totalMoney: user.totalMoney
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// User Logout
router.post('/user/logout', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await UserSession.findById(sessionId);
    if (!session || session.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const logoutTime = new Date();
    const duration = Math.floor((logoutTime - session.loginTime) / (1000 * 60)); // in minutes
    const moneyEarned = duration * session.ratePerMinute;

    // Update session
    session.logoutTime = logoutTime;
    session.sessionDuration = duration;
    session.moneyEarned = moneyEarned;
    session.isActive = false;
    await session.save();

    // Update user money
    const user = await User.findById(req.user._id);
    user.totalMoney += moneyEarned;
    user.currentSession.isOnline = false;
    await user.save();

    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      sessionId: session._id,
      amount: moneyEarned,
      type: 'earned',
      description: `Session earning: ${duration} minutes at ${session.ratePerMinute}/min`
    });
    await transaction.save();

    res.json({
      message: 'Logout successful',
      sessionDuration: duration,
      moneyEarned: moneyEarned,
      totalMoney: user.totalMoney
    });
  } catch (error) {
    res.status(500).json({ message: 'Logout failed', error: error.message });
  }
});

// ==================== NUMBER MANAGEMENT ROUTES ====================

// Admin: Upload/Create Number
router.post('/admin/numbers', authenticateAdmin, async (req, res) => {
  try {
    const { value, title, description } = req.body;

    const number = new Number({
      value,
      title,
      description,
      createdBy: req.user._id
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

// Admin: Get All Numbers
router.get('/admin/numbers', authenticateAdmin, async (req, res) => {
  try {
    const numbers = await Number.find().populate('createdBy', 'username').sort({ createdAt: -1 });

    res.json({
      message: 'Numbers retrieved successfully',
      numbers
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve numbers', error: error.message });
  }
});

// Admin: Update Number
router.put('/admin/numbers/:id', authenticateAdmin, async (req, res) => {
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
router.delete('/admin/numbers/:id', authenticateAdmin, async (req, res) => {
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

// User: Get Active Numbers
router.get('/user/numbers', authenticateToken, async (req, res) => {
  try {
    const numbers = await Number.find({ isActive: true })
      .select('value title description createdAt')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Numbers retrieved successfully',
      numbers
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve numbers', error: error.message });
  }
});

// ==================== APP SETTINGS ROUTES ====================

// Admin: Update Rate Per Minute
router.post('/admin/settings/rate', authenticateAdmin, async (req, res) => {
  try {
    const { ratePerMinute } = req.body;

    let setting = await AppSettings.findOne({ settingName: 'ratePerMinute' });

    if (setting) {
      setting.settingValue = ratePerMinute;
      setting.updatedBy = req.user._id;
    } else {
      setting = new AppSettings({
        settingName: 'ratePerMinute',
        settingValue: ratePerMinute,
        description: 'Rate per minute for user sessions',
        updatedBy: req.user._id
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

// Admin: Get All Settings
router.get('/admin/settings', authenticateAdmin, async (req, res) => {
  try {
    const settings = await AppSettings.find().populate('updatedBy', 'username');

    res.json({
      message: 'Settings retrieved successfully',
      settings
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve settings', error: error.message });
  }
});

// ==================== USER MANAGEMENT ROUTES ====================

// Admin: Get All Users
router.get('/admin/users', authenticateAdmin, async (req, res) => {
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
router.get('/admin/users/:userId/sessions', authenticateAdmin, async (req, res) => {
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

// User: Get Profile
router.get('/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    res.json({
      message: 'Profile retrieved successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve profile', error: error.message });
  }
});

// User: Get My Sessions
router.get('/user/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await UserSession.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      message: 'Sessions retrieved successfully',
      sessions
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve sessions', error: error.message });
  }
});

// User: Get Current Session Status
router.get('/user/session/current', authenticateToken, async (req, res) => {
  try {
    const activeSession = await UserSession.findOne({
      userId: req.user._id,
      isActive: true
    });

    if (!activeSession) {
      return res.status(404).json({ message: 'No active session found' });
    }

    const currentTime = new Date();
    const duration = Math.floor((currentTime - activeSession.loginTime) / (1000 * 60));
    const estimatedEarning = duration * activeSession.ratePerMinute;

    res.json({
      message: 'Current session status',
      session: {
        id: activeSession._id,
        loginTime: activeSession.loginTime,
        duration: duration,
        ratePerMinute: activeSession.ratePerMinute,
        estimatedEarning: estimatedEarning
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get session status', error: error.message });
  }
});

// ==================== TRANSACTION ROUTES ====================

// User: Get Transaction History
router.get('/user/transactions', authenticateToken, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
      .populate('sessionId', 'loginTime logoutTime sessionDuration')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Transactions retrieved successfully',
      transactions
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve transactions', error: error.message });
  }
});

// Admin: Get All Transactions
router.get('/admin/transactions', authenticateAdmin, async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('userId', 'username email')
      .populate('sessionId', 'loginTime logoutTime sessionDuration')
      .sort({ createdAt: -1 });

    res.json({
      message: 'All transactions retrieved successfully',
      transactions
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve transactions', error: error.message });
  }
});

module.exports = router;