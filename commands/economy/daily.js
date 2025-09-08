const EconomyUser = require('../../models/economyUser');

module.exports = {
    name: 'daily',
    description: 'Claim your daily reward of $1000.',
    usage: '!daily',
    aliases: ['claimdaily', 'dailies'],
    slash: true,
    async execute(client, ctx, args) {
        const userId = ctx.user ? ctx.user.id : ctx.author.id;
        let user = await EconomyUser.findOne({ discordId: userId });
        if (!user) {
            user = new EconomyUser({ discordId: userId, balance: 0 });
            await user.save();
        }
        // Always pull latest balance from DB
        user = await EconomyUser.findOne({ discordId: userId });
        const now = new Date();
        if (user.lastDaily && now - user.lastDaily < 24 * 60 * 60 * 1000) {
            const next = new Date(user.lastDaily.getTime() + 24 * 60 * 60 * 1000);
            const ms = next - now;
            const hours = Math.floor(ms / (60 * 60 * 1000));
            const minutes = Math.ceil((ms % (60 * 60 * 1000)) / (60 * 1000));
            let timeStr = '';
            if (hours > 0) timeStr += `${hours} hour${hours !== 1 ? 's' : ''} `;
            if (minutes > 0) timeStr += `${minutes} minute${minutes !== 1 ? 's' : ''}`;
            return ctx.reply({ content: `You already claimed your daily! Come back in ${timeStr.trim()}.`, ephemeral: true });
        }
        user.balance += 1000;
        user.lastDaily = now;
        await user.save();
        return ctx.reply({ content: `You claimed your daily $1000! Your new balance is $${user.balance}.`, ephemeral: false });
    }
};
