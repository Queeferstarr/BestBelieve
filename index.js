
require('dotenv').config();
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	]
});

client.commands = new Collection();
client.aliases = new Collection();

// Handlers
require('./handlers/commandHandler')(client);
require('./handlers/eventHandler')(client);
// Start Last.fm scrobble watcher for bot status
require('./events/trackScrobble').execute(client);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
	.then(() => console.log('MongoDB Connected!'))
	.catch(err => console.error(err));

// Login
client.login(process.env.TOKEN);
