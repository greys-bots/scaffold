class TextCommand {
	name;
	description;
	extra;
	arguments = { };

	usage = [];
	guildOnly = false;
	permissions = [];
	alias = [];

	constructor(data) {
		for(var k in data) {
			this[k] = data[k]
		}
	}

	async execute(ctx) {
		return 'Override this!';
	}
}

module.exports = TextCommand;