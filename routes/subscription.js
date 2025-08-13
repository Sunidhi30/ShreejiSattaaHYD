
// routes/subscription.js
const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const UserSubscription = require('../models/UserSubscription');
const User = require('../models/User');
const { adminAuth, userAuth } = require('../middleware/auth');

// ============ SUBSCRIPTION PACKAGE ROUTES ============

// GET /api/subscriptions - Get all subscription packages (Public)
router.get('/', async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ isActive: true })
      .populate('createdBy', 'username')
      .sort({ price: 1 });

    res.status(200).json({
      success: true,
      data: subscriptions,
      message: 'Subscription packages fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subscriptions',
      error: error.message
    });
  }
});

// POST /api/subscriptions - Create subscription package (Admin only)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, description, price, duration, features } = req.body;

    // Validation
    if (!name || !description || !price || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, price and duration are required'
      });
    }

    if (price <= 0 || duration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price and duration must be positive numbers'
      });
    }

    const subscription = new Subscription({
      name,
      description,
      price,
      duration,
      features: features || [],
      createdBy: req.admin._id
    });

    await subscription.save();
    await subscription.populate('createdBy', 'username');

    res.status(201).json({
      success: true,
      data: subscription,
      message: 'Subscription package created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating subscription',
      error: error.message
    });
  }
});

// PUT /api/subscriptions/:id - Update subscription package (Admin only)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const subscription = await Subscription.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription package not found'
      });
    }

    res.status(200).json({
      success: true,
      data: subscription,
      message: 'Subscription package updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating subscription',
      error: error.message
    });
  }
});

// DELETE /api/subscriptions/:id - Delete subscription package (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription package not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subscription package deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting subscription',
      error: error.message
    });
  }
});

// POST /api/subscriptions/:id/purchase - Purchase subscription (User only)
router.post('/:id/purchase', userAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;
    const userId = req.user._id;

    // Check if subscription package exists
    const subscription = await Subscription.findById(id);
    if (!subscription || !subscription.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Subscription package not found or inactive'
      });
    }

    // Check if user has sufficient balance (if paying from wallet)
    const user = await User.findById(userId);
    if (paymentMethod === 'wallet' && user.wallet.balance < subscription.price) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    // Check if user already has an active subscription
    const activeSubscription = await UserSubscription.findOne({
      userId,
      status: 'active',
      endDate: { $gt: new Date() }
    });

    if (activeSubscription) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription'
      });
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + subscription.duration);

    // Create user subscription
    const userSubscription = new UserSubscription({
      userId,
      subscriptionId: id,
      startDate,
      endDate,
      paymentAmount: subscription.price,
      paymentMethod
    });

    await userSubscription.save();

    // Deduct money from wallet if payment method is wallet
    if (paymentMethod === 'wallet') {
      await User.findByIdAndUpdate(userId, {
        $inc: { 'wallet.balance': -subscription.price }
      });
    }

    await userSubscription.populate([
      { path: 'subscriptionId', select: 'name description features' },
      { path: 'userId', select: 'username email' }
    ]);

    res.status(201).json({
      success: true,
      data: userSubscription,
      message: 'Subscription purchased successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error purchasing subscription',
      error: error.message
    });
  }
});

// GET /api/subscriptions/my-subscription - Get user's current subscription
router.get('/my-subscription', userAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    const userSubscription = await UserSubscription.findOne({
      userId,
      status: 'active',
      endDate: { $gt: new Date() }
    })
    .populate('subscriptionId', 'name description features')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: userSubscription,
      message: userSubscription ? 'Active subscription found' : 'No active subscription'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription',
      error: error.message
    });
  }
});

module.exports = router;
