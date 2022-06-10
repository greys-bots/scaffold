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
		var cmd = data;
		cmd.name = `${this.name} ${data.name}`;
		cmd.parent = this;
		cmd.module = this.module;
		cmd.guildOnly = cmd.guildOnly ?? this.guildOnly;
		cmd.permissions = cmd.permissions ?? this.permissions;
		this.sub_aliases.set(data.name, data.name);
		if(data.alias) data.alias.forEach(a => this.sub_aliases.set(a, data.name));
		this.subcommands.set(data.name, cmd);

		return this;
	}
}

module.exports = TextCommand;