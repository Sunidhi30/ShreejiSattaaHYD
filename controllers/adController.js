const Ad = require('../models/Ad');

// Get ads for display
exports.getAds = async (req, res) => {
  try {
    const { platform = 'web', country, language, userSegment = 'all' } = req.query;
    
    // Build query for active ads
    const now = new Date();
    const query = {
      isActive: true,
      startDate: { $lte: now },
      $or: [
        { endDate: null },
        { endDate: { $gte: now } }
      ],
      $or: [
        { platforms: 'all' },
        { platforms: platform }
      ],
      $or: [
        { userSegments: 'all' },
        { userSegments: userSegment }
      ]
    };

    // Add country/language targeting if provided
    if (country) {
      query.$or.push(
        { countries: [] },
        { countries: { $in: [country] } }
      );
    }
    if (language) {
      query.$or.push(
        { languages: [] },
        { languages: { $in: [language] } }
      );
    }

    const ads = await Ad.find(query)
      .sort('-priority')
      .limit(10);

    // Update impressions (async)
    if (ads.length > 0) {
      const adIds = ads.map(ad => ad._id);
      Ad.updateMany(
        { _id: { $in: adIds } },
        { $inc: { impressions: 1 } }
      ).exec();
    }

    res.json({
      success: true,
      data: ads
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Track ad click
exports.trackClick = async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { $inc: { clicks: 1 } },
      { new: true }
    );

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    // Recalculate CTR
    ad.ctr = (ad.clicks / (ad.impressions || 1)) * 100;
    await ad.save();

    res.json({
      success: true,
      data: ad
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Admin CRUD operations
exports.createAd = async (req, res) => {
  try {
    const ad = new Ad({
      ...req.body,
      createdBy: req.user._id
    });
    await ad.save();
    
    await logAction(req.user._id, 'Ad created', { adId: ad._id });
    
    res.status(201).json({
      success: true,
      data: ad
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// ... Add updateAd, deleteAd, listAds, getAdById similar to above