
// routes/admob.js
const express = require('express');
const router = express.Router();
const AdMob = require('../models/AdMob');
// const { adminAuth } = require('../middleware/auth');
const { adminAuth } = require('../middleware/auth');

// GET /api/admob - Get all ads (Admin only)
router.get('/', async (req, res) => {
  try {
    const { adType, placement, isActive } = req.query;
    
    let filter = {};
    if (adType) filter.adType = adType;
    if (placement) filter.placement = placement;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const ads = await AdMob.find(filter)
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: ads.length,
      data: ads
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
// GET /api/admob/active - Get active ads for frontend (Public)
router.get('/active', async (req, res) => {
  try {
    const { adType, placement } = req.query;
    
    let filter = { isActive: true };
    if (adType) filter.adType = adType;
    if (placement) filter.placement = placement;

    const ads = await AdMob.find(filter).select('adType publisherId placement frequency');

    res.status(200).json({
      success: true,
      data: ads
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
// GET /api/admob/:id - Get single ad (Admin only)
router.get('/:id', async (req, res) => {
  try {
    const ad = await AdMob.findById(req.params.id)
      .populate('createdBy', 'username email');

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    res.status(200).json({
      success: true,
      data: ad
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
// POST /api/admob - Create new ad (Admin only)
router.post('/', adminAuth,  async (req, res) => {
  try {
    const { adType, publisherId, adName, description, placement, frequency } = req.body;

    // Check if ad type already exists for this placement
    const existingAd = await AdMob.findOne({ adType, placement });
    if (existingAd) {
      return res.status(400).json({
        success: false,
        message: `${adType} ad already exists for ${placement} placement`
      });
    }
    const newAd = new AdMob({
      adType,
      publisherId,
      adName,
      description,
      placement,
      frequency,
      createdBy: req.admin._id 
    });

    await newAd.save();
    await newAd.populate('createdBy', 'username email');

    res.status(201).json({
      success: true,
      message: 'Ad created successfully',
      data: newAd
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: Object.values(error.errors).map(e => e.message)
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ad configuration already exists for this type and placement'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
// PUT /api/admob/:id - Update ad (Admin only)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { adType, publisherId, adName, description, placement, frequency, isActive } = req.body;

    const ad = await AdMob.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    // Check for duplicate if changing adType or placement
    if ((adType && adType !== ad.adType) || (placement && placement !== ad.placement)) {
      const existingAd = await AdMob.findOne({ 
        adType: adType || ad.adType, 
        placement: placement || ad.placement,
        _id: { $ne: req.params.id }
      });
      
      if (existingAd) {
        return res.status(400).json({
          success: false,
          message: `${adType || ad.adType} ad already exists for ${placement || ad.placement} placement`
        });
      }
    }

    const updatedAd = await AdMob.findByIdAndUpdate(
      req.params.id,
      {
        ...(adType && { adType }),
        ...(publisherId && { publisherId }),
        ...(adName && { adName }),
        ...(description !== undefined && { description }),
        ...(placement && { placement }),
        ...(frequency && { frequency }),
        ...(isActive !== undefined && { isActive })
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email');

    res.status(200).json({
      success: true,
      message: 'Ad updated successfully',
      data: updatedAd
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
// DELETE /api/admob/:id - Delete ad (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const ad = await AdMob.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    await AdMob.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Ad deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
// PUT /api/admob/:id/toggle - Toggle ad status (Admin only)
router.put('/:id/toggle', adminAuth, async (req, res) => {
  try {
    const ad = await AdMob.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    ad.isActive = !ad.isActive;
    await ad.save();
    await ad.populate('createdBy', 'username email');

    res.status(200).json({
      success: true,
      message: `Ad ${ad.isActive ? 'activated' : 'deactivated'} successfully`,
      data: ad
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
// POST /api/admob/:id/track - Track ad interaction (Public)
router.post('/:id/track', adminAuth, async (req, res) => {
  try {
    const { type, revenue = 0 } = req.body; // type: 'impression' or 'click'
    
    if (!['impression', 'click'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tracking type. Use "impression" or "click"'
      });
    }

    const ad = await AdMob.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    if (type === 'impression') {
      ad.impressions += 1;
    } else if (type === 'click') {
      ad.clicks += 1;
    }

    if (revenue > 0) {
      ad.revenue += revenue;
    }

    await ad.save();

    res.status(200).json({
      success: true,
      message: 'Ad interaction tracked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
// GET /api/admob/analytics/summary - Get analytics summary (Admin only)
router.get('/analytics/summary', adminAuth, async (req, res) => {
  try {
    const analytics = await AdMob.aggregate([
      {
        $group: {
          _id: '$adType',
          totalAds: { $sum: 1 },
          activeAds: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalImpressions: { $sum: '$impressions' },
          totalClicks: { $sum: '$clicks' },
          totalRevenue: { $sum: '$revenue' }
        }
      },
      {
        $project: {
          adType: '$_id',
          totalAds: 1,
          activeAds: 1,
          totalImpressions: 1,
          totalClicks: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          ctr: {
            $round: [
              { $multiply: [{ $divide: ['$totalClicks', '$totalImpressions'] }, 100] },
              2
            ]
          },
          _id: 0
        }
      }
    ]);

    // Overall summary
    const overallSummary = await AdMob.aggregate([
      {
        $group: {
          _id: null,
          totalAds: { $sum: 1 },
          activeAds: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalImpressions: { $sum: '$impressions' },
          totalClicks: { $sum: '$clicks' },
          totalRevenue: { $sum: '$revenue' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overall: overallSummary[0] || {
          totalAds: 0,
          activeAds: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalRevenue: 0
        },
        byAdType: analytics
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
module.exports = router;