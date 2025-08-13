
// routes/prediction.js
const express = require('express');
const router = express.Router();
const Prediction = require('../models/Prediction');
const Question = require('../models/Question');
const Match = require('../models/Match');
const UserSubscription = require('../models/UserSubscription');
const { userAuth } = require('../middleware/auth');

// ============ PREDICTION ROUTES (User only - View predictions made by admin) ============

// GET /api/predictions/match/:matchId - Get all predictions for a match (User view only)
router.get('/match/:matchId', userAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user._id;

    // Check if user has premium subscription for premium content
    const hasSubscription = await UserSubscription.findOne({
      userId,
      status: 'active',
      endDate: { $gt: new Date() }
    });

    // Get all questions for the match
    let filter = { matchId, isActive: true };
    
    // If user doesn't have subscription, exclude premium questions
    if (!hasSubscription) {
      filter.isPremium = false;
    }

    const questions = await Question.find(filter)
      .populate('matchId', 'team1 team2 matchDate venue status')
      .populate('tournamentId', 'name')
      .sort({ createdAt: 1 });

    // Get admin predictions (you might want to create a separate model for admin predictions)
    // For now, we'll show the questions with their options as "predictions"
    const predictions = questions.map(question => ({
      _id: question._id,
      questionText: question.questionText,
      questionType: question.questionType,
      options: question.options,
      correctAnswer: question.correctAnswer,
      isPremium: question.isPremium,
      match: question.matchId,
      tournament: question.tournamentId
    }));

    res.status(200).json({
      success: true,
      data: {
        predictions,
        hasSubscription: !!hasSubscription,
        match: questions[0]?.matchId
      },
      message: 'Predictions fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching predictions',
      error: error.message
    });
  }
});
module.exports = router;
