const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'invite',
    description: 'Get the bot\'s invite link.',
    usage: '!invite',
    aliases: ['invitelink', 'inv'],
    async execute(client, message, args) {
        const embed = new EmbedBuilder()
            .setTitle('Invite Me!')
            .setDescription('[Click here to invite the bot!](https://discord.com/oauth2/authorize?client_id=1413537223944573118)')
            .setColor(0x5865F2);
        return message.reply({ embeds: [embed] });
    }
};
