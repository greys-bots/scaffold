const { Collection } = require('discord.js');

class CommandHandler {
	menus = new Map();
	cooldowns = new Map();

	constructor(bot, path) {
		this.bot = bot;

		this.bot.once('ready', () => {
			console.log('Loading commands...');
			this.load(path);
			console.log('Commands loaded.');
		})

		this.bot.on('messageReactionAdd', (reaction, user) => {
			this.handleMenu(reaction, user);
		})
	}

	load(path) {
		var modules = new Collection();
		var mod_aliases = new Collection();
		var commands = new Collection();
		var aliases = new Collection();

		var files = this.bot.utils.recursivelyReadDirectory(path);

		for(var f of files) {
			var path_frags = f.replace(path, "").split(/(?:\\|\/)/);
			var modn = path_frags.length > 1 ? path_frags[path_frags.length - 2] : "Unsorted";
			var file = path_frags[path_frags.length - 1];
			if(!modules.get(modn.toLowerCase())) {
				delete require.cache[require.resolve(f.replace(file, "/__mod.js"))];
				var mod_info = require(file == "__mod.js" ? f : f.replace(file, "__mod.js"));
				modules.set(modn.toLowerCase(), {...mod_info, name: modn, commands: new Collection()})
				mod_aliases.set(modn.toLowerCase(), modn.toLowerCase());
				if(mod_info.alias) mod_info.alias.forEach(a => mod_aliases.set(a, modn.toLowerCase()));
			}
			if(file == "__mod.js") continue;

			var mod = modules.get(modn.toLowerCase());
			if(!mod) {
				console.log("Whoopsies");
				continue;
			}

			delete require.cache[require.resolve(f)];
			var command = require(f)(this.bot, this.bot.stores, mod);
			command.fullName = `${modn} ${command.name}`;
			commands.set(command.name, command);
			mod.commands.set(command.name, command);
			aliases.set(command.name, command.name);
			if(command.alias) command.alias.forEach(a => aliases.set(a, command.name));
		}

		this.bot.modules = modules;
		this.bot.mod_aliases = mod_aliases;
		this.bot.commands = commands;
		this.bot.aliases = aliases;
	}

	async parse(str) {
		var args = str.trim().split(" ");

		if(!args[0]) return {};
	
		var command = this.bot.commands.get(this.bot.aliases.get(args[0].toLowerCase()));
		if(!command) return {command, args};

		args.shift();

		if(args[0] && command.subcommands?.get(command.sub_aliases.get(args[0].toLowerCase()))) {
			command = command.subcommands.get(command.sub_aliases.get(args[0].toLowerCase()));
			args.shift();
		}
		if(command.groupArgs) args = this.groupArgs(args);

		return {command, args};
	}

	async handle(ctx) {
		var {command, args, msg, config: cfg} = ctx;
		if(command.guildOnly && !msg.channel.guild) return "That command is guild only!";
		if(msg.channel.guild) {
			var check = this.checkPerms(ctx, cfg);
			if(!check) return "You don't have permission to use that command!";
		}
		if(command.cooldown && this.cooldowns.get(`${msg.author.id}-${command.name}`)) {
			var s = Math.ceil((this.cooldowns.get(`${msg.author.id}-${command.name}`) - Date.now()) / 1000)
			var m = await msg.channel.send(`Cool down time! Please wait **${s}s** before using this command`);
			setTimeout(() => m.delete(), s * 1000);
			return;
		}

		var time = new Date();
		var success = true;
		try {
			var result = await command.execute({bot: this.bot, msg, args});
		} catch(e) {

			return Promise.reject(e);
		}

		await this.bot.db.query(`INSERT INTO analytics (command, type, time, success) VALUES ($1, $2, $3, $4)`, [
			command.fullName,
			0, // for text command
			time,
			success
		])

		if(command.cooldown) {
			this.cooldowns.set(`${msg.author.id}-${command.name}`, Date.now() + (command.cooldown * 1000));
			setTimeout(() => this.cooldowns.delete(`${msg.author.id}-${command.name}`), command.cooldown * 1000);
		}
		
		if(!result) return;
		if(Array.isArray(result)) { //embeds
			var message = await msg.channel.send({embeds: [result[0].embed ?? result[0]]});
			if(result[1]) {
				this.menus.set(message.id, {
					user: msg.author.id,
					data: result,
					index: 0,
					timeout: setTimeout(()=> {
						if(!this.menus.get(message.id)) return;
						try {
							message.reactions.removeAll();
						} catch(e) {
							console.log(e);
						}
						this.menus.delete(message.id);
					}, 900000),
					execute: this.bot.utils.paginateEmbeds
				});
				["⬅️", "➡️", "⏹️"].forEach(r => message.react(r));
			}
		} else if(typeof result == "object") {
			if(result.embed || result.title)
				await msg.channel.send({embeds: [result.embed ?? result]});
			else await msg.channel.send(result);
		}
		else await msg.channel.send(result);
	}

	async handleMenu(reaction, user) {
		if(user.bot) return;

		var msg;
		if(reaction.message.partial) {
			try {
				msg = await reaction.message.fetch();
			} catch(e) {
				if(e.message.includes('Unknown')) return;
				else return Promise.reject(e);
			}
		} else msg = reaction.message;

		var config;
		if(msg.channel.guild && this.bot.stores?.configs) config = await this.bot.stores.configs.get(msg.channel.guild.id);
		else config = undefined;

		var menu = this.menus.get(msg.id);
		if(!menu) return;
		if(menu.user == user.id) {
			try {
				await menu.execute(this.bot, msg, reaction, user, config);
			} catch(e) {
				console.log(e);
				await msg.channel.send("ERR! "+e.message);
			}
		}
	}

	checkPerms(ctx, cfg) {
		var {command: cmd, msg} = ctx;
		if(!cmd.permissions?.[0]) return true;
		if(cmd.permissions && msg.member.permissions.has(cmd.permissions))
			return true;

		var found = this.findOpped(msg.member ?? msg.author, cfg?.opped)
		if(found && cmd.opPerms){			
			return (cmd.opPerms.filter(p => found.perms.includes(p))
					.length == cmd.opPerms.length);
		}
		return false;
	}

	findOpped(user, opped) {
		if(!opped || !user) return;

		var f = opped.users?.find(u => u.id == user.id);
		if(f) return f;

		if(user.roles) {
			f = opped.roles.find(r => user.roles.cache.has(r.id));
			if(f) return f;
		}

		return;
	}

	groupArgs(args) {
		if(typeof args == "object") args = args.join(" ");
		var nargs = [];
		var tmp;
		var regex = /[“”](.+?)[“”]|[‘’](.+?)[‘’]|"(.+?)"|'(.+?)'|(\S+)/gi;
		while(tmp = regex.exec(args)) {
			tmp.splice(1).forEach(m => { if(m) nargs.push(m); });
		}

		return nargs;
	}

	registerSubcommands(command, module, name) {	
		if(command.subcommands) {
			var subcommands = command.subcommands;
			command.subcommands = new Collection();
			Object.keys(subcommands).forEach(c => {
				var cmd = subcommands[c];
				cmd.name = `${command.name} ${c}`;
				cmd.parent = command;
				cmd.module = command.module;
				if(!command.sub_aliases) command.sub_aliases = new Collection();
				command.sub_aliases.set(c, c);
				if(cmd.alias) cmd.alias.forEach(a => command.sub_aliases.set(a, c));
				if(command.permissions && !cmd.permissions) cmd.permissions = command.permissions;
				if(command.guildOnly != undefined && cmd.guildOnly == undefined)
					cmd.guildOnly = command.guildOnly;
				command.subcommands.set(c, cmd);
			})
		}
		return command;
	}
}

module.exports = (bot, path) => new CommandHandler(bot, path);