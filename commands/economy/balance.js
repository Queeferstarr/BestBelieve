const EconomyUser = require('../../models/economyUser');

module.exports = {
    name: 'balance',
    description: 'Check your balance.',
    usage: '!balance',
    aliases: ['bal', 'money', 'wallet'],
    slash: true,
    async execute(client, ctx, args) {
        const userId = ctx.user ? ctx.user.id : ctx.author.id;
        let user = await EconomyUser.findOne({ discordId: userId });
        if (!user) {
            user = new EconomyUser({ discordId: userId, balance: 0 });
            await user.save();
        }
        return ctx.reply({ content: `Your balance is $${user.balance}.`, ephemeral: false });
    }
};
