const EconomyUser = require('../../models/economyUser');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

function drawCard() {
    const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11]; // 10 for J/Q/K, 11 for Ace
    return values[Math.floor(Math.random() * values.length)];
}

function handValue(hand) {
    let sum = hand.reduce((a, b) => a + b, 0);
    let aces = hand.filter(card => card === 11).length;
    while (sum > 21 && aces > 0) {
        sum -= 10;
        aces--;
    }
    return sum;
}

function handString(hand) {
    return hand.map(card => card === 11 ? 'A' : card).join(', ');
}

module.exports = {
    name: 'blackjack',
    description: 'Play interactive blackjack against the bot. Others can join for 30 seconds to compete for the pot.',
    usage: '!blackjack <bet>',
    aliases: ['bj', '21'],
    slash: true,
    options: [
        {
            name: 'bet',
            description: 'Amount to bet (min $1)',
            type: 4,
            required: true
        }
    ],
    async execute(client, ctx, args) {
        const bet = parseInt(args && args[0] ? args[0] : ctx.options?.getInteger('bet'), 10);
        if (isNaN(bet) || bet < 1) return ctx.reply({ content: 'Minimum bet is $1.', ephemeral: true });
        const userId = ctx.user ? ctx.user.id : ctx.author.id;
        let user = await EconomyUser.findOne({ discordId: userId });
        if (!user || user.balance < bet) return ctx.reply({ content: 'Insufficient funds.', ephemeral: true });

        // Multiplayer join phase
        const participants = [{ id: userId, hand: [drawCard(), drawCard()], stand: false, double: false, bet }];
        const joinMsg = await ctx.reply({ content: `Blackjack started for $${bet}! Others have 30 seconds to join with /blackjack ${bet}.`, ephemeral: false });
        // For now, only the command user plays. (Expand: add join logic here)
        await new Promise(res => setTimeout(res, 30000));

        // Deduct bet for all participants
        for (const p of participants) {
            let u = await EconomyUser.findOne({ discordId: p.id });
            if (u && u.balance >= bet) {
                u.balance -= bet;
                await u.save();
            } else {
                p.eliminated = true;
            }
        }
        // Remove eliminated
        const active = participants.filter(p => !p.eliminated);
        if (!active.length) return joinMsg.edit({ content: 'No valid players joined.' });

        let botHand = [drawCard(), drawCard()];
        let turn = 0;
        let finished = Array(active.length).fill(false);

        async function updateGame(interaction) {
            const embed = new EmbedBuilder()
                .setTitle('Blackjack')
                .setDescription(active.map((p, i) => {
                    const turnMark = i === turn ? '➡️ ' : '';
                    return `${turnMark}<@${p.id}>: ${handString(p.hand)} (Total: ${handValue(p.hand)})${p.stand ? ' 🛑' : ''}${p.double ? ' (Doubled)' : ''}`;
                }).join('\n'))
                .addFields({ name: 'Bot Hand', value: `${botHand[0]}, ?` });
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary).setDisabled(finished[turn] || handValue(active[turn].hand) >= 21),
                new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Secondary).setDisabled(finished[turn]),
                new ButtonBuilder().setCustomId('double').setLabel('Double Down').setStyle(ButtonStyle.Success).setDisabled(finished[turn] || active[turn].hand.length !== 2 || active[turn].double || active[turn].bet * 2 > (await EconomyUser.findOne({ discordId: active[turn].id })).balance + active[turn].bet)
            );
            if (interaction) {
                await interaction.update({ embeds: [embed], components: [row] });
            } else {
                await joinMsg.edit({ embeds: [embed], components: [row] });
            }
        }

        await updateGame();

        // Button collector for turns
        const collector = joinMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120_000,
            filter: i => i.user.id === active[turn].id
        });


        collector.on('collect', async interaction => {
            try {
                const player = active[turn];
                if (interaction.customId === 'hit') {
                    player.hand.push(drawCard());
                    if (handValue(player.hand) >= 21) finished[turn] = true;
                } else if (interaction.customId === 'stand') {
                    player.stand = true;
                    finished[turn] = true;
                } else if (interaction.customId === 'double') {
                    let u = await EconomyUser.findOne({ discordId: player.id });
                    if (u && u.balance >= player.bet) {
                        u.balance -= player.bet;
                        await u.save();
                        player.bet *= 2;
                        player.double = true;
                        player.hand.push(drawCard());
                        finished[turn] = true;
                    } else {
                        await interaction.reply({ content: 'Not enough balance to double down.', ephemeral: true });
                        return;
                    }
                }
                // Next turn
                if (finished[turn]) {
                    let next = (turn + 1) % active.length;
                    let looped = false;
                    while (finished[next]) {
                        next = (next + 1) % active.length;
                        if (next === turn) { looped = true; break; }
                    }
                    if (looped || finished.every(f => f)) {
                        collector.stop();
                        return endGame();
                    }
                    turn = next;
                }
                await updateGame(interaction);
            } catch (err) {
                if (err.code !== 10062) console.error(err);
            }
        });

        collector.on('end', async () => {
            await endGame();
        });

        async function endGame() {
            // Bot plays
            while (handValue(botHand) < 17) botHand.push(drawCard());
            let results = [];
            for (const player of active) {
                const val = handValue(player.hand);
                const botVal = handValue(botHand);
                let result, payout = 0;
                let u = await EconomyUser.findOne({ discordId: player.id });
                if (val > 21) result = 'bust';
                else if (botVal > 21 || val > botVal) { result = 'win'; payout = player.bet * 2; }
                else if (val === botVal) { result = 'push'; payout = player.bet; }
                else result = 'lose';
                if (u && payout > 0) {
                    u.balance += payout;
                    await u.save();
                }
                results.push({ id: player.id, val, botVal, result, payout, hand: player.hand });
            }
            const embed = new EmbedBuilder()
                .setTitle('Blackjack Results')
                .setDescription(results.map(r => `<@${r.id}>: ${handString(r.hand)} (${r.val}) — ${r.result === 'win' ? `Won $${r.payout}` : r.result === 'push' ? 'Push' : 'Lost'}`).join('\n'))
                .addFields({ name: 'Bot Hand', value: handString(botHand) + ` (Total: ${handValue(botHand)})` });
            await joinMsg.edit({ embeds: [embed], components: [] });
        }
    }
};
