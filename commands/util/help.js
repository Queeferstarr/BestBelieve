const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    description: 'Shows all commands or info about a specific command.',
    usage: '!help [command] or /help [command]',
    aliases: ['h'],
    slash: true,
    async execute(client, ctx, args) {
        // Support both message and interaction
        const isInteraction = ctx.isChatInputCommand?.() || ctx.isUserContextMenuCommand?.();
        const send = (embed) => {
            if (isInteraction) {
                if (ctx.replied || ctx.deferred) return ctx.followUp({ embeds: [embed], ephemeral: true });
                return ctx.reply({ embeds: [embed], ephemeral: true });
            } else {
                return ctx.reply({ embeds: [embed] });
            }
        };
        const arg = args && args[0] ? args[0] : (isInteraction && ctx.options?.getString('command'));
        if (!arg) {
            // Group by category
            const categories = {};
            client.commands.forEach(cmd => {
                if (!categories[cmd.category]) categories[cmd.category] = [];
                categories[cmd.category].push(cmd);
            });
            const embed = new EmbedBuilder()
                .setTitle('Help Menu')
                .setDescription('List of all commands grouped by category:')
                .setColor(0x00AE86);
            for (const [cat, cmds] of Object.entries(categories)) {
                embed.addFields({ name: `__${cat}__`, value: cmds.map(c => `\`${c.name}\``).join(', '), inline: false });
            }
            return send(embed);
        } else {
            const name = arg.toLowerCase();
            const command = client.commands.get(name) || client.commands.get(client.aliases.get(name));
            if (!command) return send(new EmbedBuilder().setDescription('Command not found.').setColor(0xED4245));
            const embed = new EmbedBuilder()
                .setTitle(`Command: ${command.name}`)
                .setColor(0x00AE86)
                .addFields(
                    { name: 'Description', value: command.description || 'No description' },
                    { name: 'Usage', value: command.usage || 'No usage' },
                    { name: 'Aliases', value: command.aliases ? command.aliases.join(', ') : 'None' },
                    { name: 'Category', value: command.category || 'Uncategorized' },
                    { name: 'Prefix Command', value: command.slash === false ? 'No' : 'Yes', inline: true },
                    { name: 'Slash Command', value: command.slash === false ? 'No' : 'Yes', inline: true },
                    { name: 'User Command', value: command.userCommand ? 'Yes' : 'No', inline: true }
                );
            if (command.usage && command.usage.includes('<')) {
                embed.setFooter({ text: 'Arguments in <angle brackets> are required.' });
            }
            return send(embed);
        }
    },
    options: [
        {
            name: 'command',
            description: 'The command to get help for',
            type: 3,
            required: false
        }
    ]
};
