
// routes/tournament.js
const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const Question = require('../models/Question');
const { adminAuth } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const cloudinary = require("../utils/cloudinary")
// ============ TOURNAMENT ROUTES ============
// GET /api/tournaments - Get all tournaments (Public)
router.get('/tournaments', async (req, res) => {
  try {
    const tournaments = await Tournament.find({ isActive: true })
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: tournaments,
      message: 'Tournaments fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tournaments',
      error: error.message
    });
  }
});
// POST /api/tournaments - Create tournament (Admin only)
router.post('/tournaments', adminAuth, async (req, res) => {
  try {
    const { name, description, startDate, endDate, tournamentType } = req.body;

    // Validation
    if (!name || !description || !startDate || !endDate || !tournamentType) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const tournament = new Tournament({
      name,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      tournamentType,
      createdBy: req.admin._id
    });

    await tournament.save();
    await tournament.populate('createdBy', 'username');

    res.status(201).json({
      success: true,
      data: tournament,
      message: 'Tournament created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating tournament',
      error: error.message
    });
  }
});
// PUT /api/tournaments/:id - Update tournament (Admin only)
router.put('/tournaments/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const tournament = await Tournament.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username');

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    res.status(200).json({
      success: true,
      data: tournament,
      message: 'Tournament updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating tournament',
      error: error.message
    });
  }
});
// DELETE /api/tournaments/:id - Delete tournament (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const tournament = await Tournament.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Tournament deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting tournament',
      error: error.message
    });
  }
});
// ============ MATCH ROUTES ============
// GET /api/tournaments/:tournamentId/matches - Get matches for tournament
router.get('/:tournamentId/matches', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const matches = await Match.find({ 
      tournamentId, 
      isActive: true 
    })
    .populate('tournamentId', 'name')
    .sort({ matchDate: 1 });

    res.status(200).json({
      success: true,
      data: matches,
      message: 'Matches fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching matches',
      error: error.message
    });
  }
});
// POST /api/tournaments/:tournamentId/matches - Create match (Admin only)
router.post(
    '/:tournamentId/matches',
    adminAuth,
    upload.fields([
      { name: 'team1Logo', maxCount: 1 },
      { name: 'team2Logo', maxCount: 1 }
    ]),
    async (req, res) => {
      try {
        const { tournamentId } = req.params;
        const { team1Name, team2Name, matchDate, venue, matchType } = req.body;
  
        // Validation
        if (!team1Name || !team2Name || !matchDate || !venue || !matchType) {
          return res.status(400).json({
            success: false,
            message: 'All fields are required'
          });
        }
  
        // Check if tournament exists
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
          return res.status(404).json({
            success: false,
            message: 'Tournament not found'
          });
        }
  
        // Upload to Cloudinary
        let team1LogoUrl = '';
        let team2LogoUrl = '';
  
        if (req.files?.team1Logo) {
          const result1 = await cloudinary.uploader.upload(req.files.team1Logo[0].path, {
            folder: 'tournaments/team-logos'
          });
          team1LogoUrl = result1.secure_url;
        }
  
        if (req.files?.team2Logo) {
          const result2 = await cloudinary.uploader.upload(req.files.team2Logo[0].path, {
            folder: 'tournaments/team-logos'
          });
          team2LogoUrl = result2.secure_url;
        }
  
        // Create match
        const match = new Match({
          tournamentId,
          team1: {
            name: team1Name,
            logo: team1LogoUrl
          },
          team2: {
            name: team2Name,
            logo: team2LogoUrl
          },
          matchDate: new Date(matchDate),
          venue,
          matchType,
          createdBy: req.admin._id
        });
  
        await match.save();
        await match.populate('tournamentId', 'name');
  
        res.status(201).json({
          success: true,
          data: match,
          message: 'Match created successfully'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Error creating match',
          error: error.message
        });
      }
    }
);
// PUT /api/tournaments/:tournamentId/matches/:matchId - Update match (Admin only)
router.put('/:tournamentId/matches/:matchId', adminAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const updateData = req.body;

    const match = await Match.findByIdAndUpdate(
      matchId,
      updateData,
      { new: true, runValidators: true }
    ).populate('tournamentId', 'name');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    res.status(200).json({
      success: true,
      data: match,
      message: 'Match updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating match',
      error: error.message
    });
  }
});
// ============ QUESTION ROUTES ============
// GET /api/tournaments/:tournamentId/matches/:matchId/questions - Get questions for match
router.get('/:tournamentId/matches/:matchId/questions', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { isPremium } = req.query;

    let filter = { matchId, isActive: true };
    
    // If user is not premium, exclude premium questions
    if (isPremium !== 'true') {
      filter.isPremium = false;
    }

    const questions = await Question.find(filter)
      .populate('matchId', 'team1 team2 matchDate')
      .populate('tournamentId', 'name')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: questions,
      message: 'Questions fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message
    });
  }
});
// POST /api/tournaments/:tournamentId/matches/:matchId/questions - Create question (Admin only)
router.post('/:tournamentId/matches/:matchId/questions', adminAuth, async (req, res) => {
  try {
    const { tournamentId, matchId } = req.params;
    const { questionText, questionType, options, isPremium } = req.body;

    // Validation
    if (!questionText || !questionType || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Question text, type and at least 2 options are required'
      });
    }

    // Check if match exists
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    const question = new Question({
      matchId,
      tournamentId,
      questionText,
      questionType,
      options,
      isPremium: isPremium || false,
      createdBy: req.admin._id
    });

    await question.save();
    await question.populate([
      { path: 'matchId', select: 'team1 team2 matchDate' },
      { path: 'tournamentId', select: 'name' }
    ]);

    res.status(201).json({
      success: true,
      data: question,
      message: 'Question created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating question',
      error: error.message
    });
  }
});
// PUT /api/tournaments/:tournamentId/matches/:matchId/questions/:questionId - Update question (Admin only)
router.put('/:tournamentId/matches/:matchId/questions/:questionId', adminAuth, async (req, res) => {
  try {
    const { questionId } = req.params;
    const updateData = req.body;

    const question = await Question.findByIdAndUpdate(
      questionId,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'matchId', select: 'team1 team2 matchDate' },
      { path: 'tournamentId', select: 'name' }
    ]);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.status(200).json({
      success: true,
      data: question,
      message: 'Question updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating question',
      error: error.message
    });
  }
});
// POST /api/tournaments/:tournamentId/matches/:matchId/questions/:questionId/answer - Set correct answer (Admin only)
router.post('/:tournamentId/matches/:matchId/questions/:questionId/answer', adminAuth, async (req, res) => {
  try {
    const { questionId } = req.params;
    const { correctAnswer } = req.body;

    if (!correctAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Correct answer is required'
      });
    }

    const question = await Question.findByIdAndUpdate(
      questionId,
      { correctAnswer },
      { new: true }
    );

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Update predictions based on correct answer
    const Prediction = require('../models/Prediction');
    await Prediction.updateMany(
      { questionId },
      [{
        $set: {
          isCorrect: { $eq: ['$selectedAnswer', correctAnswer] },
          points: {
            $cond: {
              if: { $eq: ['$selectedAnswer', correctAnswer] },
              then: 10, // Points for correct answer
              else: 0
            }
          }
        }
      }]
    );

    res.status(200).json({
      success: true,
      data: question,
      message: 'Correct answer set successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error setting correct answer',
      error: error.message
    });
  }
});
router.post('/options/:tournamentId/matches/:matchId/questions/:questionId/answer', adminAuth, async (req, res) => {
    try {
      const { questionId } = req.params;
      const { optionId } = req.body; // we'll pass optionId instead of correctAnswer text
  
      if (!optionId) {
        return res.status(400).json({
          success: false,
          message: 'Option ID for correct answer is required'
        });
      }
  
      // Find the question
      const question = await Question.findById(questionId);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }
  
      // Check if option exists in question
      const selectedOption = question.options.id(optionId);
      if (!selectedOption) {
        return res.status(404).json({
          success: false,
          message: 'Option not found in this question'
        });
      }
  
      // Set all options isCorrect = false, then set the correct one to true
      question.options.forEach(opt => {
        opt.isCorrect = opt._id.toString() === optionId;
      });
  
      // Save correctAnswer as the text of the chosen option
      question.correctAnswer = selectedOption.optionText;
  
      await question.save();
  
      // Update predictions
      const Prediction = require('../models/Prediction');
      await Prediction.updateMany(
        { questionId },
        [{
          $set: {
            isCorrect: { $eq: ['$selectedAnswer', selectedOption.optionText] },
            points: {
              $cond: {
                if: { $eq: ['$selectedAnswer', selectedOption.optionText] },
                then: 10,
                else: 0
              }
            }
          }
        }]
      );
  
      res.status(200).json({
        success: true,
        data: question,
        message: 'Correct answer set successfully'
      });
  
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error setting correct answer',
        error: error.message
      });
    }
});
module.exports = router;
