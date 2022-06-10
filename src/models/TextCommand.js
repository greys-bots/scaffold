const { Collection } = require('discord.js');

class TextCommand {
	name;
	description;
	extra;
	arguments = { };

	usage = [];
	guildOnly = false;
	permissions = [];
	alias = [];

	module;

	constructor(data) {
		this.subcommands = new Collection();
		this.sub_aliases = new Collection();
		for(var k in data) {
			this[k] = data[k]
		}
	}

	async execute(ctx) {
		return 'Override this!';
	}

	addSubcommand(data) {
		var c = data.name;
		var cmd = data;
		cmd.name = `${this.name} ${c}`;
		cmd.parent = this;
		cmd.module = this.module;
		cmd.guildOnly = cmd.guildOnly ?? this.guildOnly;
		cmd.permissions = cmd.permissions ?? this.permissions;
		this.sub_aliases.set(c, c);
		if(data.alias) data.alias.forEach(a => this.sub_aliases.set(a, c));
		this.subcommands.set(c, cmd);

		return this;
	}
}

module.exports = TextCommand;