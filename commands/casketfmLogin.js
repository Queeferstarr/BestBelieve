const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'casketfmlogin',
    description: 'Link your Spotify account to CasketFM for scrobbling.',
    usage: '!casketfmlogin',
    aliases: ['cfmlogin', 'casketfm-login', 'spotifylogin'],
    slash: true,
    async execute(client, ctx, args) {
        const userId = ctx.author ? ctx.author.id : ctx.user.id;
    const loginUrl = `https://coffinfm.onrender.com/login?state=${userId}`;
        const embed = new EmbedBuilder()
            .setTitle('CasketFM Spotify Login')
            .setDescription(`To enable Spotify scrobbling, [click here to link your Spotify account](${loginUrl}).`)
            .setColor(0x1DB954)
            .setFooter({ text: 'Your Spotify account is only used for scrobbling and is kept private.' });
        if (ctx.isChatInputCommand?.() || ctx.isUserContextMenuCommand?.()) {
            return ctx.reply({ embeds: [embed], flags: 64 });
        }
        return ctx.reply({ embeds: [embed] });
    }
};
