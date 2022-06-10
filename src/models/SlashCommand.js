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

		return data;
	}
}

module.exports = SlashCommand;