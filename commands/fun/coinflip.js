module.exports = {
    name: 'coinflip',
    description: 'Flip a coin!',
    usage: '!coinflip',
    aliases: ['flip', 'cf', 'coin'],
    slash: true,
    async execute(client, ctx, args) {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        return ctx.reply({ content: `🪙 The coin landed on **${result}**!`, ephemeral: false });
    }
};
