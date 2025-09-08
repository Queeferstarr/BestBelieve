const fs = require('fs');
const path = require('path');



const { REST, Routes, ApplicationCommandType, SlashCommandBuilder, ContextMenuCommandBuilder } = require('discord.js');
const PREFIX = '!';

function loadCommands(dir, client, slashCommands = [], userCommands = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            loadCommands(fullPath, client, slashCommands, userCommands);
        } else if (file.endsWith('.js')) {
            const command = require(fullPath);
            command.category = path.basename(path.dirname(fullPath));
            client.commands.set(command.name, command);
            if (command.aliases && Array.isArray(command.aliases)) {
                command.aliases.forEach(alias => client.aliases.set(alias, command.name));
            }
            // Register as slash command if supported
            if (command.slash !== false) {
                let slashCmd = new SlashCommandBuilder()
                    .setName(command.name)
                    .setDescription(command.description || 'No description');
                if (command.usage && command.usage.includes('<')) {
                    // crude arg support: add a string option for each <arg>
                    const usageArgs = command.usage.match(/<([^>]+)>/g);
                    if (usageArgs) {
                        usageArgs.forEach((arg, i) => {
                            slashCmd.addStringOption(opt =>
                                opt.setName(arg.replace(/[<>]/g, '').toLowerCase())
                                    .setDescription(arg.replace(/[<>]/g, ''))
                                    .setRequired(i === 0)
                            );
                        });
                    }
                }
                slashCommands.push(slashCmd.toJSON());
            }
            // Register as user command if supported
            if (command.userCommand) {
                userCommands.push(new ContextMenuCommandBuilder()
                    .setName(command.name)
                    .setType(ApplicationCommandType.User)
                    .toJSON());
            }
        }
    }
    return { slashCommands, userCommands };
}

module.exports = (client) => {
    // Load commands and collect slash/user commands
    const { slashCommands, userCommands } = loadCommands(path.join(__dirname, '../commands'), client, [], []);

    // Register slash and user commands on ready
    client.once('ready', async () => {
        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
        try {
            // Register globally (change to Routes.applicationGuildCommands for dev)
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: [...slashCommands, ...userCommands] }
            );
            console.log('Slash and user commands registered globally.');
        } catch (error) {
            console.error('Failed to register slash/user commands:', error);
        }
    });

    // Prefix command handler

    client.on('messageCreate', async message => {
        if (message.author.bot || !message.guild) return;

        // Special trigger: ,np @bot
        if (message.content.trim().toLowerCase() === ',np <@' + client.user.id + '>') {
            // Use ToxicHumans' Discord ID (replace with your actual Discord ID if needed)
            const toxicHumansId = '184376969016877056';
            const npCommand = client.commands.get('np');
            if (npCommand) {
                try {
                    await npCommand.execute(client, message, [], toxicHumansId);
                } catch (err) {
                    console.error(err);
                    message.reply('There was an error fetching the most recent scrobble.');
                }
            }
            return;
        }

        if (!message.content.startsWith(PREFIX)) return;

        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();

        const command = client.commands.get(cmdName) || client.commands.get(client.aliases.get(cmdName));
        if (!command) return;

        try {
            await command.execute(client, message, args);
        } catch (err) {
            console.error(err);
            message.reply('There was an error executing that command.');
        }
    });

    // Slash command handler
    client.on('interactionCreate', async interaction => {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                // Convert options to args array for compatibility
                const args = interaction.options.data.map(opt => opt.value);
                await command.execute(client, interaction, args);
            } catch (err) {
                console.error(err);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error executing that command.', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
                }
            }
        } else if (interaction.isUserContextMenuCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (command && command.userCommand) {
                try {
                    await command.userCommand(client, interaction);
                } catch (err) {
                    console.error(err);
                    await interaction.reply({ content: 'There was an error executing that user command.', ephemeral: true });
                }
            }
        }
    });
};
