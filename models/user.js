const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    lastfm: { type: String },
    crowns: {
        type: Map,
        of: Number,
        default: {}
    }
    // ...existing code...
});

module.exports = mongoose.model('User', userSchema);
