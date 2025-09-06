const mongoose = require('mongoose');

const casketFMSchema = new mongoose.Schema({
    discordId: { type: String, required: true },
    trackId: { type: String, required: true },
    trackName: { type: String, required: true },
    artistName: { type: String, required: true },
    albumName: { type: String },
    playedAt: { type: Date, default: Date.now },
    durationMs: { type: Number },
    progressMs: { type: Number },
    isLocal: { type: Boolean, default: false }
});

module.exports = mongoose.model('CasketFM', casketFMSchema);
