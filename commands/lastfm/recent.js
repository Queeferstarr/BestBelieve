
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const User = require('../../models/user');
const API_KEY = 'e09dd6a820e1c0497396a7f45f783699';

module.exports = {
    name: 'recent',
    description: 'Show your most recent Last.fm scrobbles.',
    usage: '!recent [username]',
    aliases: ['lfrecent', 'lf recent', 'lastfmrecent', 'lastfm recents', 'recents'],
    slash: true,
    options: [
        {
            name: 'username',
            description: 'Last.fm username (optional, defaults to your linked account)',
            type: 3,
            required: false
        }
    ],
    async execute(client, ctx, args) {
        let username = args && args[0] ? args[0] : (ctx.options?.getString ? ctx.options.getString('username') : null);
        if (!username) {
            // Try to get from DB
            const userId = ctx.user ? ctx.user.id : ctx.author.id;
            const user = await User.findOne({ discordId: userId });
            if (!user || !user.lastfm) {
                return ctx.reply({ content: 'No Last.fm username linked. Use `/lfset <username>` to set yours or provide one now.', ephemeral: true });
            }
            username = user.lastfm;
        }
        try {
            const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${API_KEY}&format=json&limit=5`;
            const res = await fetch(url);
            if (!res.ok) return ctx.reply({ content: 'Failed to fetch Last.fm data.', ephemeral: true });
            const data = await res.json();
            const tracks = data.recenttracks && data.recenttracks.track;
            if (!tracks || tracks.length === 0) return ctx.reply({ content: 'No recent scrobbles found.', ephemeral: true });
            const embed = new EmbedBuilder()
                .setTitle(`Recent scrobbles for ${username}`)
                .setColor('#D51007')
                .setTimestamp();
            tracks.forEach((track, i) => {
                embed.addFields({
                    name: `${i + 1}. ${track.artist['#text']} — ${track.name}`,
                    value: track.album['#text'] ? `Album: ${track.album['#text']}` : 'No album info',
                    inline: false
                });
            });
            return ctx.reply({ embeds: [embed], ephemeral: false });
        } catch (err) {
            console.error('[LASTFM] Error fetching recents:', err);
            return ctx.reply({ content: 'Error fetching Last.fm recents.', ephemeral: true });
        }
    }
};
