const { Collection } = require('discord.js');
const DKEYS = [
	'name',
	'description',
	'type',
	'options'
]

class SlashCommand {
	name;
	description;
	type = 1;
	options = [];

	usage = [];
	guildOnly = false;
	permissions = [];
	ephemeral = false;
	module;

	subcommands = new Collection();
	
	constructor(data) {
		for(var k in data)
			this[k] = data[k];
	}

	async execute(ctx) {
		return "Override this!";
	}

	async auto(ctx) {
		return [{
			name: 'Override this!',
			value: 'unset'
		}]
	}

	transform() {
		var data = { };
		for(var k of DKEYS) {
			data[k] = this[k]
		}

		if(this.guildOnly)
			data.dm_permission = false;
		if(this.permissions?.length)
			data.default_member_permissions = '0';
		if(!data.options) data.options = [];
		if(this.subcommands?.first())
			data.options.concat(this.subcommands.map(sc => {
				var d = sc.transform();
				return { ...d, type: d.type ?? 1 }
			}));
		if(this.type == 3) delete data.description;

		return data;
	}

	addSubcommand(scmd) {
		this.subcommands.set(scmd.name, scmd);
		return this;
	}
}

module.exports = SlashCommand;