const { Client, Intents } = require('discord.js');

class FrameClient extends Client {
	constructor(clientOptions, botData) {
		super(clientOptions);

		for(var k in botData) this[k] = botData[k];
		this.status = 0;

		if(this.statuses?.length) {
			this.on('ready', () => this.handleStatus());
		}
	}

	async handleStatus() {
		if(!this.statuses?.length) return;

		var target = this.statuses[this.status % this.statuses.length];
		if(typeof target == "function") this.user.setActivity(await target(this));
		else this.user.setActivity(target);
		this.status++;
			
		setTimeout(()=> this.handleStatus(), 60 * 1000) // 5 mins
	}
}

module.exports = FrameClient;