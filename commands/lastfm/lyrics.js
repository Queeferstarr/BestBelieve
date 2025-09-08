const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const User = require('../../models/user');
const API_KEY = 'e09dd6a820e1c0497396a7f45f783699';
const GENIUS_API_KEY = process.env.GENIUS_API_KEY;
const GENIUS_ACCESS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;

async function getLyricsFromGenius(query) {
    // Use access token if available, else fallback to API key
    const token = GENIUS_ACCESS_TOKEN || GENIUS_API_KEY;
    if (!token) return null;
    const searchRes = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const hit = searchData.response.hits[0]?.result;
    if (!hit) return null;
    // Scrape lyrics from song page (Genius API does not provide lyrics directly)
    const pageRes = await fetch(hit.url);
    if (!pageRes.ok) return null;
    const html = await pageRes.text();
    const match = html.match(/<div class="lyrics">([\s\S]*?)<\/div>/) || html.match(/<div data-lyrics-container="true">([\s\S]*?)<\/div>/);
    let lyrics = match ? match[1] : null;
    if (lyrics) {
        // Remove HTML tags
        lyrics = lyrics.replace(/<[^>]+>/g, '').trim();
    }
    return { title: hit.full_title, url: hit.url, lyrics };
}

module.exports = {
    name: 'lyrics',
    description: 'Get lyrics for your most recent Last.fm track or a searched song using Genius.',
    usage: '!lyrics [song name]',
    aliases: ['lflyrics', 'songlyrics'],
    slash: true,
    options: [
        {
            name: 'query',
            description: 'Song name (optional, defaults to your most recent scrobble)',
            type: 3,
            required: false
        }
    ],
    async execute(client, ctx, args) {
        let query = args && args[0] ? args.join(' ') : (ctx.options?.getString ? ctx.options.getString('query') : null);
        if (!query) {
            // Get most recent scrobble from Last.fm
            const userId = ctx.user ? ctx.user.id : ctx.author.id;
            const user = await User.findOne({ discordId: userId });
            if (!user || !user.lastfm) {
                return ctx.reply({ content: 'No Last.fm username linked. Use `/lfset <username>` to set yours or provide a song name.', ephemeral: true });
            }
            const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(user.lastfm)}&api_key=${API_KEY}&format=json&limit=1`;
            const res = await fetch(url);
            if (!res.ok) return ctx.reply({ content: 'Failed to fetch Last.fm data.', ephemeral: true });
            const data = await res.json();
            const track = data.recenttracks && data.recenttracks.track && data.recenttracks.track[0];
            if (!track || !track.artist || !track.name) return ctx.reply({ content: 'Could not determine your most recent track.', ephemeral: true });
            query = `${track.artist['#text']} ${track.name}`;
        }
    if (!GENIUS_ACCESS_TOKEN && !GENIUS_API_KEY) return ctx.reply({ content: 'Genius API key/token not set in environment.', ephemeral: true });
    const result = await getLyricsFromGenius(query);
        if (!result || !result.lyrics) return ctx.reply({ content: 'Lyrics not found for that song.', ephemeral: true });
        const embed = new EmbedBuilder()
            .setTitle(result.title)
            .setURL(result.url)
            .setDescription(result.lyrics.length > 4000 ? result.lyrics.slice(0, 3997) + '...' : result.lyrics)
            .setColor('#fffc3c')
            .setFooter({ text: 'Powered by Genius' });
        return ctx.reply({ embeds: [embed], ephemeral: false });
    }
};
