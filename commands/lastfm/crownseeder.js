const User = require('../../models/user');
const fetch = require('node-fetch');
const API_KEY = 'e09dd6a820e1c0497396a7f45f783699';

// Helper to get all unique artists for a user
async function getAllArtistsForUser(lastfm) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=library.getartists&user=${encodeURIComponent(lastfm)}&api_key=${API_KEY}&format=json&limit=1000`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.artists && data.artists.artist) ? data.artists.artist.map(a => a.name) : [];
}

// Helper to get playcount for a user/artist
async function getPlaycount(lastfm, artist) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artist)}&username=${encodeURIComponent(lastfm)}&api_key=${API_KEY}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const data = await res.json();
    return parseInt(data?.artist?.stats?.userplaycount || '0', 10);
}

module.exports = {
    name: 'crownseeder',
    description: 'Auto-calculate and assign crowns for all artists and users in the server.',
    usage: '!crownseeder',
    aliases: ['seedcrowns', 'autocrowns'],
    slash: true,
    async execute(client, ctx, args) {
        const guild = ctx.guild;
        if (!guild) return ctx.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    // Only use cached members to avoid timeouts
    const memberIds = Array.from(guild.members.cache.keys());
    const users = await User.find({ discordId: { $in: memberIds }, lastfm: { $exists: true, $ne: null } });
        // Gather all unique artists
        const artistSet = new Set();
        for (const user of users) {
            const artists = await getAllArtistsForUser(user.lastfm);
            artists.forEach(a => artistSet.add(a));
        }
        // For each artist, find the top user and assign crown
        for (const artist of artistSet) {
            const leaderboard = [];
            for (const user of users) {
                const playcount = await getPlaycount(user.lastfm, artist);
                if (playcount > 0) leaderboard.push({ discordId: user.discordId, playcount });
            }
            leaderboard.sort((a, b) => b.playcount - a.playcount);
            // Only one crown per artist: remove crown from others
            await User.updateMany(
                { [`crowns.${artist.toLowerCase()}`]: { $exists: true } },
                { $unset: { [`crowns.${artist.toLowerCase()}`]: '' } }
            );
            if (leaderboard.length) {
                const top = leaderboard[0];
                await User.updateOne(
                    { discordId: top.discordId },
                    { $set: { [`crowns.${artist.toLowerCase()}`]: top.playcount } },
                    { upsert: true }
                );
            }
        }
        return ctx.reply({ content: 'Crowns have been seeded for all artists and users in this server.', ephemeral: false });
    }
};