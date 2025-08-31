const mongoose = require('mongoose');

const ArtistSchema = new mongoose.Schema({
    name: { type: String, required: true },
    genre: { type: String },
    bio: { type: String },
    image: { type: String }, // URL de la photo
    cover: { type: String }, // URL de la bannière
    isVerified: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Artist', ArtistSchema);