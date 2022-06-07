const { Client, Intents } = require('discord.js');

class FrameClient extends Client {
	constructor(data) {
		super(data);
	}
}

module.exports = FrameClient;