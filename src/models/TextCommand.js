class TextCommand {
	#bot;
	#stores;

	name;
	description;
	arguments = { };

	usage = [];
	guildOnly = false;
	permissions = [];
	alias = [];

	constructor(bot, stores, data) {
		this.#bot = bot;
		this.#stores = stores;

		for(var k in data) {
			this[k] = data[k]
		}
	}

	async execute(ctx) {
		return 'Override this!';
	}
}

module.exports = TextCommand;