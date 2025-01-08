const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    image: String,
    opinion: String,
    rating: Number,
    coordinates: { lat: Number, lon: Number },
    createdAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
