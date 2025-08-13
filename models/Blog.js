// models/Blog.js
const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: { // text content of the blog
    type: String,
    required: true
  },
  image: { // blog main image (Cloudinary or other URL)
    type: String,
    required: true
  },
  isTop: { // ✅ New field for marking top blogs
    type: Boolean,
    default: false
  },
  createdBy: { // link blog to admin
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Blog', blogSchema);
