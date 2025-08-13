const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  team1: {
    name: {
      type: String,
      required: true
    },
    logo: {
      type: String,
      required: true
    }
  },
  team2: {
    name: {
      type: String,
      required: true
    },
    logo: {
      type: String,
      required: true
    }
  },
  matchDate: {
    type: Date,
    required: true
  },
  venue: {
    type: String,
    required: true
  },
  matchType: {
    type: String,
    enum: ['T20', 'ODI', 'Test'],
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  result: {
    winner: {
      type: String,
      enum: ['team1', 'team2', 'draw', 'no_result']
    },
    winnerName: String,
    margin: String, // e.g., "5 wickets", "10 runs"
    manOfTheMatch: String
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
module.exports = mongoose.model('Match', matchSchema);