const {
	Collection
} = require('discord.js');
const { REST } = require('@discordjs/rest');
const {
	Routes,
	InteractionType,
	ComponentType
} = require('discord-api-types/v10');
const { pageBtns: PAGE } = require('../extras');
const axios = require('axios');

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

class InteractionHandler {
	menus = new Collection();

	constructor(bot, path, sharded) {
		this.bot = bot;
		this.commandPath = path;
		if(typeof sharded == "boolean") this.sharded = sharded;
		else this.sharded = !!bot.shard ?? false;

		bot.on('interactionCreate', (interaction) => {
			this.handle(interaction);
		})

		bot.once('ready', async () => {
			console.log('Loading app commands...');
			await this.load();
			console.log('App commands loaded.')
		})
	}

	async load() {
		var slashCommands = new Collection(); // actual commands, with execute data
		var slashData = new Collection(); // just what gets sent to discord
		var devOnly = new Collection(); // slashData: dev edition
		var slashNames = []; // for help parsing help stuff later

		var files = this.bot.utils.recursivelyReadDirectory(this.commandPath);

		for(var f of files) {
			var path_frags = f.replace(this.commandPath, "").split(/(?:\\|\/)/); // get fragments of path to slice up
			var mods = path_frags.slice(1, -1); // the module names (folders SHOULD = mod name)
			var file = path_frags[path_frags.length - 1]; // the actual file name
			if(file == '__mod.js') continue; // ignore mod files, only load if command exists
			delete require.cache[require.resolve(f)]; // for reloading
			
			var command = require(f)(this.bot, this.bot.stores); // again, full command data

			// if the commands are part of modules,
			// then we need to nest them into those modules for parsing
			if(mods.length) {
				let curmod; // current FULL module data
				for(var i = 0; i < mods.length; i++) {
					var group; // the mod we're using. basically curmod but for this loop
					if(!curmod) {
						// start of loop, set up group and current mod
						curmod = slashCommands.get(mods[i]);
						group = curmod;
					} else {
						// just get the group out of the curmod's subcommands
						group = curmod.subcommands.get(mods[i]);
					}

					if(!group) {
						// no group data? we need to create it
						var mod;
						delete require.cache[require.resolve(this.commandPath + `/${mods.slice(0, i + 1).join("/")}/__mod.js`)];
						var ms = mods.slice(0, i + 1);
						mod = require(this.commandPath + `/${ms.join("/")}/__mod.js`)(this.bot, this.bot.store);
						group = mod;
						group.type = group.type ?? 1;

						if(!curmod) {
							// start of loop again, also means we can
							// safely set this as a top-level command in our collections
							group.fullName = mod.name;
							slashNames.push(group.fullName);
							slashCommands.set(mod.name, group);
						} else {
							// otherwise it belongs nested below the current module data
							group.fullName = ms.join(" ");
							slashNames.push(group.fullName);
							curmod.addSubcommand(group);
						}
					}

					// set the current mod to the group so we have proper nesting for
					// the next group or command
					curmod = group;
				}

				// inherit permissions from parent module
				command.permissions = command.permissions ?? curmod.permissions;
				command.opPerms = command.opPerms ?? curmod.opPerms;
				command.guildOnly = command.guildOnly ?? curmod.guildOnly;
				command.fullName = mods.join(' ') + ` ${command.name}`;
				slashNames.push(command.fullName);

				curmod.addSubcommand(command) // nest the command
			} else {
				// no mods? just make it top-level
				command.fullName = command.name;
				slashNames.push(command.fullName);
				
				slashCommands.set(command.name, command);
			}
		}

		this.bot.slashCommands = slashCommands; // for safe keeping
		slashData = slashCommands.map(s => s.transform());
		this.bot.slashNames = slashNames;

		// all of below is just sending it off to discord
		if(this.sharded && !this.bot.shard.ids.includes(0)) return;
		try {
			if(!this.bot.application?.owner) await this.bot.application?.fetch();

			var cmds = slashData.map(d => d);
			var dcmds = devOnly.map(d => d);
			if(process.env.COMMAND_GUILD == process.env.DEV_GUILD) {
				cmds = cmds.concat(dcmds);
				await rest.put(
					Routes.applicationGuildCommands(this.bot.application.id, process.env.COMMAND_GUILD),
					{ body: cmds },
				);

				await rest.put(
					Routes.applicationCommands(this.bot.application.id),
					{ body: [] }
				)
			} else {
				if(process.env.COMMAND_GUILD) {
					await rest.put(
						Routes.applicationGuildCommands(this.bot.application.id, process.env.COMMAND_GUILD),
						{ body: cmds },
					);

					await rest.put(
						Routes.applicationCommands(this.bot.application.id),
						{ body: [] }
					)
				} else {
					await rest.put(
						Routes.applicationCommands(this.bot.application.id),
						{ body: cmds },
					);
				}
	
				await rest.put(
					Routes.applicationGuildCommands(this.bot.application.id, process.env.DEV_GUILD),
					{ body: dcmds },
				);
			}
			console.log("App commands were sent!");
			return;
		} catch(e) {
			console.log(e);
			return Promise.reject(e);
		}
	}

	async handle(ctx) {
		if(ctx.type == InteractionType.ApplicationCommandAutocomplete)
			this.handleAuto(ctx);
		if(ctx.type == InteractionType.ApplicationCommand)
			this.handleCommand(ctx);
		if(ctx.type == InteractionType.MessageComponent) {
			if(ctx.componentType == ComponentType.Button)
				this.handleButtons(ctx);
			if(ctx.componentType == ComponentType.SelectMenu)
				this.handleSelect(ctx);
		} 
	}

	parse(ctx) {
		var long = "";
		var cmd = this.bot.slashCommands.get(ctx.commandName);
		if(!cmd) return;
		long += cmd.name ?? cmd.name;

		if(ctx.options.getSubcommandGroup(false)) {
			cmd = cmd.subcommands.get(ctx.options.getSubcommandGroup());
			if(!cmd) return;
			long += ` ${cmd.name}`;
			var opt = ctx.options.getSubcommand(false);
			if(opt) {
				cmd = cmd.subcommands.get(opt);
				if(cmd) long += ` ${cmd.name}`;
			} else return;
		} else if(ctx.options.getSubcommand(false)) {
			cmd = cmd.subcommands.get(ctx.options.getSubcommand());
			if(!cmd) return;
			long += ` ${cmd.name}`;
		}

		if(cmd) cmd.long = long;
		return cmd;
	}

	async handleCommand(ctx) {
		var cmd = this.parse(ctx);
		if(!cmd) return;

		var cfg;
		var usages;
		if(ctx.guild && ctx.client.stores?.configs) cfg = await ctx.client.stores.configs.get(ctx.guild.id);
		if(ctx.guild && ctx.client.stores?.usages) usages = await ctx.client.stores.usages.get(ctx.guild.id);

		var check = this.checkPerms(cmd, ctx, cfg, usages);
		if(!check) return await ctx.reply({
			content: "You don't have permission to use this command!",
			ephemeral: true
		});
		if(cmd.guildOnly && !ctx.guildId) return await ctx.reply({
			content: "That command is guild only!",
			ephemeral: true
		})
		
		var time = new Date();
		var success = true;
		try {
			var res = await cmd.execute(ctx);
		} catch(e) {
			success = false;
			var eobj = {
				guild: ctx.guild ? `${ctx.guild.name} (${ctx.guild.id})` : 'DMs',
				user: `${ctx.user.tag} (${ctx.user.id})`,
				command: cmd.fullName,
				time
			}
			console.error(eobj, e.message ?? e, '\n', e.stack);
			if(process.env.ERROR_HOOK) await axios.post(process.env.ERROR_HOOK, {
				embeds: [{
					title: 'Error',
					description: (e.message ?? e).slice(0, 4000),
					fields: [
						{
							name: 'Guild',
							value: eobj.guild
						},
						{
							name: 'User',
							value: eobj.user
						},
						{
							name: 'Command',
							value: cmd.fullName
						}
					],
					footer: { timestamp: time },
					author: {
						name: this.bot.user.tag,
						icon_url: this.bot.user.avatarURL()
					},
					color: 0xaa5555
				}]
			})
			if(ctx.replied) return await ctx.followUp({content: "Error:\n" + (e.message ?? e), ephemeral: true});
			else return await ctx.reply({content: "Error:\n" + (e.message ?? e), ephemeral: true});
		}

		if(this.bot.db) {
			await this.bot.db.query(`INSERT INTO analytics (command, type, time, success) VALUES ($1, $2, $3, $4)`, [
				cmd.fullName,
				1, // for slash command
				time,
				success
			])
		}
		if(!res) return;

		var type;
		if(ctx.deferred) type = 'editReply';
		else type = ctx.replied ? 'followUp' : 'reply'; // ew gross but it probably works
		switch(typeof res) {
			case 'string':
				return await ctx[type]({content: res, ephemeral: cmd.ephemeral ?? false})
			case 'object':
				if(Array.isArray(res)) {
					var reply = {
						embeds: [res[0]],
						ephemeral: cmd.ephemeral ?? false
					};
					if(!res[1]) return await ctx[type](reply);

					reply = {
						...reply,
						components: [
							{
								type: 1,
								components: PAGE(1, res.length)
							}
						]
					}
					await ctx[type](reply);
					var message = await ctx.editReply(reply);

					var menu = {
						user: ctx.user.id,
						interaction: ctx,
						data: res,
						index: 0,
						timeout: setTimeout(() => {
							if(!this.menus.get(message.id)) return;
							this.menus.delete(message.id);
						}, 5 * 60000),
						handle: (ctx) => this.paginate(menu, ctx)
					}

					this.menus.set(message.id, menu);

					return;
				}

				return await ctx[type]({...res, ephemeral: (res.ephemeral ?? cmd.ephemeral) ?? false})
		}
	}

	async handleButtons(ctx) {
		var {message} = ctx;
		var menu = this.menus.get(message.id);
		if(!menu) return;

		menu.handle(ctx);
	}

	async handleSelect(ctx) {
		var {message} = ctx;
		var menu = this.menus.get(message.id);
		if(!menu) return;

		menu.handle(ctx);
	}

	async handleAuto(ctx) {
		var cmd = this.parse(ctx);
		if(!cmd) return;

		var result = await cmd.auto(ctx);
		return await ctx.respond(result ?? []);
	}

	checkPerms(cmd, ctx, cfg, usages) {
		if(cmd.ownerOnly && ctx.user.id !== process.env.OWNER)
			return false;
		if(!cmd.guildOnly) return true;
		if(!ctx.member) return false; // pre-emptive in case of dm slash cmds
		if(ctx.member.permissions.has('Administrator')) return true;

		var found;
		if(ctx.guild && usages) {
			switch(usages?.type) {
				case 1:
					if(usages.whitelist?.length) {
						found = usages.whitelist.includes(ctx.user.id);
						if(!found) found = usages.whitelist.find(r => ctx.member.roles.resolve(r));
						if(!found) return false;
					}
					break;
				case 2:
					if(usages.blacklist?.length) {
						found = usages.blacklist.includes(ctx.user.id);
						if(!found) found = usages.blacklist.find(r => ctx.member.roles.resolve(r));
						if(found) return false;
					}
					break;
				default:
					break;
			}
		}

		if(cfg?.disabled?.length) {
			if(cfg.disabled.includes(cmd.fullName)) return false;
		}

		if(!cmd.permissions?.length) return true;
		if(cmd.permissions.length && ctx.member.permissions.has(cmd.permissions))
			return true;

		found = this.findOpped(ctx.member ?? ctx.user, cfg?.opped)
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

	async paginate(menu, ctx) {
		var {data} = menu;
		var {customId: id} = ctx;

		switch(id) {
			case 'first':
				menu.index = 0;
				break;
			case 'prev':
				if(menu.index == 0) {
					menu.index = data.length - 1;
				} else menu.index = (menu.index - 1) % data.length;
				break;
			case 'next':
				menu.index = (menu.index + 1) % data.length;
				break;
			case 'last':
				menu.index = data.length -1;
				break;
		}

		await ctx.update({
			embeds: [data[menu.index]],
			components: [{
				type: 1,
				components: PAGE(menu.index + 1, data.length)
			}]
		})
	}
}

module.exports = (bot, path, sharded) => new InteractionHandler(bot, path, sharded);