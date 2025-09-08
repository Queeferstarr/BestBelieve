const mongoose = require('mongoose');

const economyUserSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null }
});

module.exports = mongoose.model('EconomyUser', economyUserSchema);
