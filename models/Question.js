const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  questionText: {
    type: String,
    required: true // e.g., "Who will win the match?"
  },
  questionType: {
    type: String,
    enum: ['winner', 'toss', 'highest_scorer', 'man_of_match', 'total_runs', 'custom'],
    required: true
  },
  options: [{
    optionText: {
      type: String,
      required: true
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  correctAnswer: {
    type: String // Will be set after match completion
  },
  isPremium: {
    type: Boolean,
    default: false // Premium questions require subscription
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Question', questionSchema);
