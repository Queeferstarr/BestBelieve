const { EmbedBuilder } = require('discord.js');
module.exports = {
    name: 'avatar',
    description: 'Get your or another user\'s avatar.',
    usage: '!avatar [@user]',
    aliases: ['pfp', 'icon', 'useravatar'],
    slash: true,
    options: [
        {
            name: 'user',
            description: 'User to get avatar for',
            type: 6, // USER
            required: false
        }
    ],
    async execute(client, ctx, args) {
        let user = ctx.options?.getUser ? ctx.options.getUser('user') : null;
        if (!user && ctx.mentions && ctx.mentions.users.size > 0) {
            user = ctx.mentions.users.first();
        }
        if (!user) user = ctx.user || ctx.author;
        const avatarUrl = user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true, size: 4096 }) : user.avatarURL({ dynamic: true, size: 4096 });
        const embed = new EmbedBuilder()
            .setTitle(`${user.username}'s Avatar`)
            .setImage(avatarUrl)
            .setColor('#5865F2')
            .setURL(avatarUrl);
        return ctx.reply({ embeds: [embed], ephemeral: false });
    }
};
