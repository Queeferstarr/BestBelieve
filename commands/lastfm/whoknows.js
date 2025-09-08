const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const User = require('../../models/user');
const API_KEY = 'e09dd6a820e1c0497396a7f45f783699';

// Ensure crowns field exists
if (!User.schema.paths.crowns) {
    User.schema.add({ crowns: { type: Map, of: Number, default: {} } });
}

async function getArtistLeaderboard(guild, artist) {
    // Only use cached members to avoid timeouts
    const memberIds = Array.from(guild.members.cache.keys());
    const users = await User.find({ discordId: { $in: memberIds }, lastfm: { $exists: true, $ne: null } });
    const leaderboard = [];
    for (const user of users) {
        const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artist)}&username=${encodeURIComponent(user.lastfm)}&api_key=${API_KEY}&format=json`;
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            const playcount = parseInt(data?.artist?.stats?.userplaycount || '0', 10);
            if (playcount > 0) {
                leaderboard.push({ discordId: user.discordId, lastfm: user.lastfm, playcount });
            }
        } catch (err) { continue; }
    }
    leaderboard.sort((a, b) => b.playcount - a.playcount);
    return leaderboard;
}

module.exports = {
    name: 'whoknows',
    description: 'Leaderboard of users in this server for a Last.fm artist (scrobbles).',
    usage: '!whoknows <artist>',
    aliases: ['wk', 'who-knows', 'lastfmwhoknows', ',wk'],
    slash: true,
    options: [
        {
            name: 'artist',
            description: 'Artist name',
            type: 3,
            required: false
        }
    ],
    async execute(client, ctx, args) {
        let artist = args && args.length ? args.join(' ') : (ctx.options?.getString ? ctx.options.getString('artist') : null);
        const guild = ctx.guild;
        if (!guild) return ctx.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        // If no artist, get most recent artist for the user
        if (!artist) {
            const userId = ctx.user ? ctx.user.id : ctx.author.id;
            const user = await User.findOne({ discordId: userId });
            if (!user || !user.lastfm) return ctx.reply({ content: 'No Last.fm username linked.', ephemeral: true });
            // Fetch most recent track
            const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(user.lastfm)}&api_key=${API_KEY}&format=json&limit=1`;
            const res = await fetch(url);
            const data = await res.json();
            const track = data.recenttracks && data.recenttracks.track && data.recenttracks.track[0];
            if (!track || !track.artist || !track.artist['#text']) return ctx.reply({ content: 'Could not determine your most recent artist.', ephemeral: true });
            artist = track.artist['#text'];
        }
        // Get leaderboard
        const leaderboard = await getArtistLeaderboard(guild, artist);
        if (!leaderboard.length) return ctx.reply({ content: `No scrobbles found for '${artist}' in this server.`, ephemeral: true });
        // Only one crown per artist: remove crown from others
        const crownHolder = leaderboard[0];
        await User.updateMany(
            { [`crowns.${artist.toLowerCase()}`]: { $exists: true } },
            { $unset: { [`crowns.${artist.toLowerCase()}`]: '' } }
        );
        await User.updateOne(
            { discordId: crownHolder.discordId },
            { $set: { [`crowns.${artist.toLowerCase()}`]: crownHolder.playcount } },
            { upsert: true }
        );
        // Build embed
        const embed = new EmbedBuilder()
            .setTitle(`Who knows **${artist}**?`)
            .setColor('#D51007')
            .setDescription(leaderboard.map((u, i) => {
                const crown = i === 0 ? ' 👑' : '';
                const member = guild.members.cache.get(u.discordId);
                const name = member ? member.displayName : u.lastfm;
                return `**${i + 1}. ${name}** — ${u.playcount} scrobbles${crown}`;
            }).join('\n'))
            .setTimestamp();
        return ctx.reply({ embeds: [embed], ephemeral: false });
    }
};
