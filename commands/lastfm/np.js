const User = require('../../models/user');
const fetch = require('node-fetch');
const { EmbedBuilder } = require('discord.js');

const API_KEY = 'e09dd6a820e1c0497396a7f45f783699';

module.exports = {
    name: 'np',
    description: 'Show your now playing or most recent track from Last.fm.',
    usage: '!np [@user]',
    aliases: ['nowplaying'],
    slash: true,
    userCommand: true,
    async execute(client, ctx, args) {
        // Support both message and interaction
        const isInteraction = ctx.isChatInputCommand?.() || ctx.isUserContextMenuCommand?.();
        let userId, displayName;
        if (isInteraction && ctx.isUserContextMenuCommand?.()) {
            userId = ctx.targetUser.id;
            displayName = ctx.targetUser.username;
        } else if (isInteraction && ctx.options?.getUser('user')) {
            userId = ctx.options.getUser('user').id;
            displayName = ctx.options.getUser('user').username;
        } else if (args && args[0] && ctx.mentions && ctx.mentions.users.size > 0) {
            userId = ctx.mentions.users.first().id;
            displayName = ctx.mentions.users.first().username;
        } else {
            userId = ctx.author ? ctx.author.id : ctx.user.id;
            displayName = ctx.author ? ctx.author.username : ctx.user.username;
        }

        // Fetch last.fm username from DB
        const userDoc = await User.findOne({ discordId: userId });
        if (!userDoc || !userDoc.lastfm) {
            const reply = `${displayName} has not set a Last.fm username. Use /lfset <username> first.`;
            if (isInteraction) return ctx.reply({ content: reply, flags: 64 });
            return ctx.reply(reply);
        }
        const lastfmUser = userDoc.lastfm;

        // Fetch now playing or recent track
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(lastfmUser)}&api_key=${API_KEY}&format=json&limit=1`;
        const userInfoUrl = `https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${encodeURIComponent(lastfmUser)}&api_key=${API_KEY}&format=json`;
        let track, totalScrobbles = 0, playCount = 0, time = '';
        let cover = null;
        try {
            const [trackRes, userRes] = await Promise.all([
                fetch(url).then(r => r.json()),
                fetch(userInfoUrl).then(r => r.json())
            ]);
            if (!trackRes.recenttracks || !trackRes.recenttracks.track || trackRes.recenttracks.track.length === 0) {
                const reply = `No recent tracks found for **${lastfmUser}**.`;
                if (isInteraction) return safeInteractionReply(ctx, { content: reply, flags: 64 });
                return ctx.reply(reply);
            }
            track = Array.isArray(trackRes.recenttracks.track) ? trackRes.recenttracks.track[0] : trackRes.recenttracks.track;
            cover = track.image && track.image.length > 0 ? track.image[track.image.length - 1]['#text'] : null;
            time = track['@attr'] && track['@attr'].nowplaying ? 'Now Playing' : (track.date ? new Date(track.date.uts * 1000).toLocaleString() : 'Unknown');
            // Get playcount for this track
            if (track.artist && track.name) {
                const trackInfoUrl = `https://ws.audioscrobbler.com/2.0/?method=track.getinfo&api_key=${API_KEY}&artist=${encodeURIComponent(track.artist['#text'])}&track=${encodeURIComponent(track.name)}&username=${encodeURIComponent(lastfmUser)}&format=json`;
                const trackInfoRes = await fetch(trackInfoUrl).then(r => r.json());
                playCount = trackInfoRes.track && trackInfoRes.track.userplaycount ? trackInfoRes.track.userplaycount : 0;
            }
            totalScrobbles = userRes.user && userRes.user.playcount ? userRes.user.playcount : 0;
        } catch (err) {
            console.error(err);
            const reply = 'Failed to fetch Last.fm data.';
            if (isInteraction) return safeInteractionReply(ctx, { content: reply, flags: 64 });
            return ctx.reply(reply);
        }

        // Build embed
        const embed = new EmbedBuilder()
            .setTitle(track.name)
            .setURL(track.url)
            .setAuthor({ name: `${lastfmUser} on Last.fm`, url: `https://www.last.fm/user/${lastfmUser}` })
            .setThumbnail(cover || null)
            .addFields(
                { name: 'Artist', value: track.artist && track.artist['#text'] ? track.artist['#text'] : 'Unknown', inline: true },
                { name: 'Album', value: track.album && track.album['#text'] ? track.album['#text'] : 'Unknown', inline: true }
            )
            .setFooter({ text: `Track plays: ${playCount} | Total scrobbles: ${totalScrobbles} | Time: ${time}` })
            .setColor(0xD51007);

        // Send embed and react
        let sentMsg;
        if (isInteraction) {
            sentMsg = await safeInteractionReply(ctx, { embeds: [embed], flags: 64 });
        } else {
            sentMsg = await ctx.reply({ embeds: [embed] });
        }
        // Try to react (only works in text channels)
        try {
            if (sentMsg && sentMsg.react) {
                await sentMsg.react('👍');
                await sentMsg.react('👎');
            }
        } catch (e) {}
    },
    options: [
        {
            name: 'user',
            description: 'The user to check',
            type: 6,
            required: false
        }
    ]
};

// Helper to avoid unknown interaction errors
async function safeInteractionReply(interaction, options) {
    try {
        if (interaction.replied || interaction.deferred) {
            return await interaction.followUp(options);
        } else {
            return await interaction.reply(options);
        }
    } catch (e) {
        // Ignore unknown interaction errors
        if (e.code === 10062) return;
        throw e;
    }
}
