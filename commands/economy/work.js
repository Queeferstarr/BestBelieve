const EconomyUser = require('../../models/economyUser');

module.exports = {
    name: 'work',
    description: 'Work for a random amount of money every 30 minutes. Rare chance to hit the jackpot!',
    usage: '!work',
    aliases: ['job', 'earn'],
    slash: true,
    async execute(client, ctx, args) {
        const userId = ctx.user ? ctx.user.id : ctx.author.id;
        let user = await EconomyUser.findOne({ discordId: userId });
        if (!user) {
            user = new EconomyUser({ discordId: userId, balance: 0 });
            await user.save();
        }
        // Always pull latest
        user = await EconomyUser.findOne({ discordId: userId });
        const now = new Date();
        if (user.lastWork && now - user.lastWork < 30 * 60 * 1000) {
            const next = new Date(user.lastWork.getTime() + 30 * 60 * 1000);
            const ms = next - now;
            const minutes = Math.ceil(ms / (60 * 1000));
            return ctx.reply({ content: `You already worked! Come back in ${minutes} minute${minutes !== 1 ? 's' : ''}.`, ephemeral: true });
        }
        // Jackpot chance
        let amount = Math.floor(Math.random() * 1000) + 1;
        if (Math.random() < 0.000001) {
            amount = 1_000_000;
        }
        user.balance += amount;
        user.lastWork = now;
        await user.save();
        if (amount === 1_000_000) {
            return ctx.reply({ content: `🎉 JACKPOT! You worked and earned $1,000,000! Your new balance is $${user.balance}.`, ephemeral: false });
        } else {
            return ctx.reply({ content: `You worked and earned $${amount}. Your new balance is $${user.balance}.`, ephemeral: false });
        }
    }
};
