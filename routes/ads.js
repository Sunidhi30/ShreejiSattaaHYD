const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const { auth, adminAuth } = require('../middleware/auth');

// Public routes
router.get('/', adController.getAds);
router.post('/:id/click', adController.trackClick);
router.post('/', adminAuth, adController.createAd);
// router.get('/admin', adminAuth, adController.listAds);
// router.get('/admin/:id', adminAuth, adController.getAdById);
// router.put('/admin/:id', adminAuth, adController.updateAd);
// router.delete('/admin/:id', adminAuth, adController.deleteAd);

module.exports = router;
