const User = require('../models/user');

module.exports = {
    name: 'devresetspotify',
    description: 'Developer only: Reset the Spotify data for a user.',
    usage: '!devresetspotify <@user>',
    aliases: ['resetspotify'],
    slash: true,
    async execute(client, ctx, args) {
        const ownerId = '533079258956955671';
        const userId = ctx.author ? ctx.author.id : ctx.user.id;
        if (userId !== ownerId) {
            return ctx.reply({ content: 'You do not have permission to use this command.', flags: 64 });
        }
        let targetId;
        if (ctx.isChatInputCommand?.() && ctx.options?.getUser('user')) {
            targetId = ctx.options.getUser('user').id;
        } else if (args && args[0] && args[0].match(/\d{17,}/)) {
            targetId = args[0].replace(/\D/g, '');
        } else if (ctx.mentions && ctx.mentions.users.size > 0) {
            targetId = ctx.mentions.users.first().id;
        } else {
            return ctx.reply({ content: 'Please specify a user to reset.', flags: 64 });
        }
        try {
            const result = await User.updateOne(
                { discordId: targetId },
                { $unset: { spotify: '' } }
            );
            console.log(`[DEV] Spotify schema reset for user ${targetId} by ${userId}`);
            if (result.modifiedCount > 0) {
                return ctx.reply({ content: `Spotify data reset for <@${targetId}>.`, flags: 64 });
            } else {
                return ctx.reply({ content: `No Spotify data found for <@${targetId}>.`, flags: 64 });
            }
        } catch (err) {
            console.error(`[DEV] Error resetting Spotify schema for user ${targetId}:`, err);
            return ctx.reply({ content: 'Failed to reset Spotify data.', flags: 64 });
        }
    },
    options: [
        {
            name: 'user',
            description: 'The user to reset',
            type: 6,
            required: false
        }
    ]
};
