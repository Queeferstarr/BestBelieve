const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    lastfm: { type: String },
    spotify: {
        access_token: String,
        refresh_token: String,
        expires_in: Number,
        updated: Date
    }
});

module.exports = mongoose.model('User', userSchema);
