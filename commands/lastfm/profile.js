const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const User = require('../../models/user');
const API_KEY = 'e09dd6a820e1c0497396a7f45f783699';

module.exports = {
    name: 'profile',
    description: 'Show your Last.fm profile and stats.',
    usage: '!profile [username]',
    aliases: ['lfprofile', 'lastfmprofile', 'fmprofile'],
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
            const userId = ctx.user ? ctx.user.id : ctx.author.id;
            const user = await User.findOne({ discordId: userId });
            if (!user || !user.lastfm) {
                return ctx.reply({ content: 'No Last.fm username linked. Use `/lfset <username>` to set yours or provide one now.', ephemeral: true });
            }
            username = user.lastfm;
        }
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${encodeURIComponent(username)}&api_key=${API_KEY}&format=json`;
        const res = await fetch(url);
        if (!res.ok) return ctx.reply({ content: 'Failed to fetch Last.fm profile.', ephemeral: true });
        const data = await res.json();
        const u = data.user;
        if (!u) return ctx.reply({ content: 'User not found on Last.fm.', ephemeral: true });
        const embed = new EmbedBuilder()
            .setTitle(`${u.name}'s Last.fm Profile`)
            .setURL(u.url)
            .setThumbnail(u.image && u.image.length ? u.image[u.image.length - 1]['#text'] : null)
            .addFields(
                { name: 'Scrobbles', value: u.playcount?.toString() || '0', inline: true },
                { name: 'Artists Scrobbled', value: u.artist_count?.toString() || 'N/A', inline: true },
                { name: 'Registered', value: u.registered ? `<t:${Math.floor(Number(u.registered.unixtime))}:D>` : 'N/A', inline: true }
            )
            .setColor('#D51007')
            .setFooter({ text: `Last.fm | ${u.name}` });
        return ctx.reply({ embeds: [embed], ephemeral: false });
    }
};
