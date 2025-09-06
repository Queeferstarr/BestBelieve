const User = require('../../models/user');

module.exports = {
    name: 'lfset',
    description: 'Set your Last.fm username for future commands.',
    usage: '!lfset <lastfm_username>',
    aliases: ['lastfmset', 'setlf'],
    async execute(client, message, args) {
        if (!args[0]) return message.reply('Please provide your Last.fm username.');

        const lastfmUsername = args[0];
        try {
            let user = await User.findOne({ discordId: message.author.id });
            if (!user) {
                user = new User({ discordId: message.author.id, lastfm: lastfmUsername });
            } else {
                user.lastfm = lastfmUsername;
            }
            await user.save();
            return message.reply(`Your Last.fm username has been set to **${lastfmUsername}**!`);
        } catch (err) {
            console.error(err);
            return message.reply('There was an error saving your Last.fm username.');
        }
    }
};
