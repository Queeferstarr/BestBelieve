module.exports = {
    name: 'ban',
    description: 'Ban a user from the server.',
    usage: '!ban <user> [reason]',
    aliases: ['banuser'],
    async execute(client, message, args) {
        if (!message.member.permissions.has('BanMembers')) return message.reply('You do not have permission to use this command.');
        const user = message.mentions.members.first();
        if (!user) return message.reply('Please mention a user to ban.');
        const reason = args.slice(1).join(' ') || 'No reason provided';
        try {
            await user.ban({ reason });
            message.reply(`${user.user.tag} has been banned. Reason: ${reason}`);
        } catch (err) {
            console.error(err);
            message.reply('Failed to ban the user.');
        }
    }
};
