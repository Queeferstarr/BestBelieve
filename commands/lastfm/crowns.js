const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const User = require('../../models/user');

module.exports = {
    name: 'crowns',
    description: 'Show your Last.fm artist crowns (where you are #1 in the server).',
    usage: '!crowns',
    aliases: ['mycrowns', 'lastfmcrowns'],
    slash: true,
    async execute(client, ctx, args) {
        const userId = ctx.user ? ctx.user.id : ctx.author.id;
        const user = await User.findOne({ discordId: userId });
        if (!user || !user.crowns || user.crowns.size === 0) {
            return ctx.reply({ content: 'You have no crowns yet. Use `/whoknows <artist>` to compete for one!', ephemeral: true });
        }
        // Convert Map to array and sort by playcount descending
        const crownsArr = Array.from(user.crowns.entries()).sort((a, b) => b[1] - a[1]);
        const crownsPerPage = 10;
        let page = 0;
        const totalPages = Math.ceil(crownsArr.length / crownsPerPage);

        function getEmbed(pageIdx) {
            const embed = new EmbedBuilder()
                .setTitle('Your Last.fm Crowns 👑')
                .setColor('#D51007')
                .setTimestamp()
                .setFooter({ text: `Page ${pageIdx + 1} of ${totalPages}` });
            crownsArr.slice(pageIdx * crownsPerPage, (pageIdx + 1) * crownsPerPage).forEach(([artist, playcount]) => {
                embed.addFields({
                    name: artist.length > 256 ? artist.slice(0, 253) + '...' : artist,
                    value: `${playcount} scrobbles`,
                    inline: false
                });
            });
            return embed;
        }

        const getRow = (pageIdx) => new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(pageIdx === 0),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(pageIdx >= totalPages - 1)
        );

        const reply = await ctx.reply({
            embeds: [getEmbed(page)],
            components: totalPages > 1 ? [getRow(page)] : [],
            ephemeral: false
        });

        if (totalPages <= 1) return;

        // Button collector for pagination
        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60_000,
            filter: i => i.user.id === userId
        });

        collector.on('collect', async interaction => {
            try {
                if (interaction.customId === 'prev' && page > 0) {
                    page--;
                } else if (interaction.customId === 'next' && page < totalPages - 1) {
                    page++;
                }
                await interaction.update({
                    embeds: [getEmbed(page)],
                    components: [getRow(page)]
                });
            } catch (err) {
                if (err.code !== 10062) console.error(err);
            }
        });

        collector.on('end', async () => {
            try {
                if (reply.edit) {
                    await reply.edit({ components: [] });
                }
            } catch (err) {
                if (err.code !== 10062) console.error(err);
            }
        });
    }
};
