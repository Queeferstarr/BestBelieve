let startTime = process.uptime();

module.exports = {
    name: 'uptime',
    description: 'Show how long the bot has been running.',
    usage: '!uptime',
    aliases: ['botuptime'],
    slash: true,
    async execute(client, ctx, args) {
        const totalSeconds = Math.floor(process.uptime());
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        let str = '';
        if (days) str += `${days}d `;
        if (hours) str += `${hours}h `;
        if (minutes) str += `${minutes}m `;
        str += `${seconds}s`;
        return ctx.reply({ content: `Bot uptime: ${str.trim()}`, ephemeral: false });
    }
};
