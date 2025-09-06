const CasketFM = require('../models/casketfm');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'casketfm',
    description: 'Show your current or most recent Spotify track scrobbled by CasketFM.',
    usage: '!casketfm',
    aliases: ['cfm'],
    slash: true,
    async execute(client, ctx, args) {
        const userId = ctx.author ? ctx.author.id : ctx.user.id;
        const lastTrack = await CasketFM.findOne({ discordId: userId }).sort({ playedAt: -1 });
        if (!lastTrack) {
            const reply = 'No Spotify tracks found for you. Make sure you have played a song with CasketFM tracking enabled!';
            if (ctx.isChatInputCommand?.() || ctx.isUserContextMenuCommand?.()) {
                return ctx.reply({ content: reply, flags: 64 });
            }
            return ctx.reply(reply);
        }
        const embed = new EmbedBuilder()
            .setTitle(lastTrack.trackName)
            .setDescription(`by **${lastTrack.artistName}**${lastTrack.albumName ? ` on *${lastTrack.albumName}*` : ''}`)
            .addFields(
                { name: 'Played At', value: lastTrack.playedAt.toLocaleString(), inline: true },
                { name: 'Duration', value: lastTrack.durationMs ? `${Math.floor(lastTrack.durationMs/60000)}:${String(Math.floor((lastTrack.durationMs%60000)/1000)).padStart(2,'0')}` : 'Unknown', inline: true },
                { name: 'Local File', value: lastTrack.isLocal ? 'Yes' : 'No', inline: true }
            )
            .setFooter({ text: `Scrobbled by CasketFM` })
            .setColor(0x1DB954);
        return ctx.reply({ embeds: [embed], flags: 64 });
    }
};
