const {
	confirmVals: STRINGS,
	confirmReacts: REACTS,
	confirmBtns: BUTTONS,
	numbers: NUMBERS
} = require('../extras.js');

module.exports = {
	async genEmbeds(bot, arr, genFunc, info = {}, fieldnum, extras = {}) {
		return new Promise(async res => {
			var embeds = [];
			var current = { embed: {
				title: typeof info.title == "function" ?
								info.title(arr[0], 0) : info.title,
						description: typeof info.description == "function" ?
								info.description(arr[0], 0) : info.description,
				color: typeof info.color == "function" ?
						info.color(arr[0], 0) : info.color,
				footer: info.footer,
				fields: []
			}};
			
			for(let i=0; i<arr.length; i++) {
				if(current.embed.fields.length < (fieldnum || 10)) {
					current.embed.fields.push(await genFunc(arr[i], i, arr));
				} else {
					embeds.push(current);
					current = { embed: {
						title: typeof info.title == "function" ?
								info.title(arr[i], i) : info.title,
						description: typeof info.description == "function" ?
								info.description(arr[i], i) : info.description,
						color: typeof info.color == "function" ?
								info.color(arr[i], i) : info.color,
						footer: info.footer,
						fields: [await genFunc(arr[i], i, arr)]
					}};
				}
			}
			embeds.push(current);
			if(extras.order && extras.order == 1) {
				if(extras.map) embeds = embeds.map(extras.map);
				if(extras.filter) embeds = embeds.filter(extras.filter);
			} else {
				if(extras.filter) embeds = embeds.filter(extras.filter);
				if(extras.map) embeds = embeds.map(extras.map);
			}
			if(embeds.length > 1) {
				for(let i = 0; i < embeds.length; i++)
					embeds[i].embed.title += (extras.addition != null ? eval("`"+extras.addition+"`") : ` (page ${i+1}/${embeds.length}, ${arr.length} total)`);
			}
			res(embeds);
		})
	},
	async paginateEmbeds(bot, m, reaction) {
		switch(reaction.emoji.name) {
			case "⬅️":
				if(this.index == 0) {
					this.index = this.data.length-1;
				} else {
					this.index -= 1;
				}
				await m.edit({embeds: [this.data[this.index].embed ?? this.data[this.index]]});
				if(m.channel.type != "DM") await reaction.users.remove(this.user)
				return this;
				break;
			case "➡️":
				if(this.index == this.data.length-1) {
					this.index = 0;
				} else {
					this.index += 1;
				}
				await m.edit({embeds: [this.data[this.index].embed ?? this.data[this.index]]});
				if(m.channel.type != "DM") await reaction.users.remove(this.user)
				return this;
				break;
			case "⏹️":
				await m.delete();
				delete bot.menus[m.id];
				return undefined;
				break;
		}
	},

	async getConfirmation(bot, msg, user) {
		return new Promise(res => {

			function msgListener(message) {
				if(message.channel.id != msg.channel.id ||
				   message.author.id != user.id) return;

				clearTimeout(timeout);
				bot.removeListener('messageCreate', msgListener);
				bot.removeListener('messageReactionAdd', reactListener);
				bot.removeListener('interactionCreate', intListener)

				if(msg.components?.[0]) {
					let cmp = {
						type: 1,
						components: msg.components[msg.components.length - 1].components.map(b => ({
							...b.data,
							disabled: true
						}))
					}
					msg.edit({
						components: [
							...msg.components.slice(0, msg.components.length - 1),
							cmp
						]
					})
				}

				if(STRINGS[0].includes(message.content.toLowerCase())) return res({confirmed: true, message});
				else return res({confirmed: false, message, msg: 'Action cancelled!'});
			}

			function reactListener(react, ruser) {
				if(react.message.channel.id != msg.channel.id ||
				   ruser.id != user.id) return;

				clearTimeout(timeout);
				bot.removeListener('messageCreate', msgListener);
				bot.removeListener('messageReactionAdd', reactListener);
				bot.removeListener('interactionCreate', intListener)

				if(msg.components?.[0]) {
					let cmp = {
						type: 1,
						components: msg.components[msg.components.length - 1].components.map(b => ({
							...b.data,
							disabled: true
						}))
					}
					msg.edit({
						components: [
							...msg.components.slice(0, msg.components.length - 1),
							cmp
						]
					})
				}

				if(react.emoji.name == REACTS[0]) return res({confirmed: true, react});
				else return res({confirmed: false, react, msg: 'Action cancelled!'});
			}

			function intListener(intr) {
				if(!intr.isButton()) return;
				if(intr.channelId !== msg.channel.id ||
				   intr.user.id !== user.id) return;

				clearTimeout(timeout);
				bot.removeListener('messageCreate', msgListener);
				bot.removeListener('messageReactionAdd', reactListener);
				bot.removeListener('interactionCreate', intListener);

				let cmp = {
					type: 1,
					components: intr.message.components[intr.message.components.length - 1].components.map(b => ({
						...b.data,
						disabled: true
					}))
				}

				intr.update({
					components: [
						...intr.message.components.slice(0, intr.message.components.length - 1),
						cmp
					]
				})
				
				if(BUTTONS[0].includes(intr.customId)) return res({confirmed: true, interaction: intr});
				else return res({confirmed: false, interaction: intr, msg: 'Action cancelled!'});
			}

			const timeout = setTimeout(async () => {
				bot.removeListener('messageCreate', msgListener);
				bot.removeListener('messageReactionAdd', reactListener);
				bot.removeListener('interactionCreate', intListener)
				res({confirmed: false, msg: 'ERR! Timed out!'})
			}, 30000);

			bot.on('messageCreate', msgListener);
			bot.on('messageReactionAdd', reactListener);
			bot.on('interactionCreate', intListener)
		})
	},

	async getChoice(bot, msg, user, choices = [
		{
			name: 'yes',
			accepted: [ 'confirm', '✅' ]
		},

		{
			name: 'no',
			accepted: [ 'cancel', '❌' ],
			msg: "Action cancelled."
		}
	]) {
		return new Promise(res => {

			function msgListener(message) {
				if(message.channel.id != msg.channel.id ||
				   message.author.id != user.id) return;

				clearTimeout(timeout);
				bot.removeListener('messageCreate', msgListener);
				bot.removeListener('messageReactionAdd', reactListener);
				bot.removeListener('interactionCreate', intListener)
				var choice = choices.find(c => c.accepted.includes(message.content.toLowerCase()));
				if(choice) return res({...choice, message});
				else return res({choice: 'invalid', message, msg: 'Invalid choice'});
			}

			function reactListener(react, ruser) {
				if(react.message.channel.id != msg.channel.id ||
				   ruser.id != user.id) return;

				clearTimeout(timeout);
				bot.removeListener('messageCreate', msgListener);
				bot.removeListener('messageReactionAdd', reactListener);
				bot.removeListener('interactionCreate', intListener)
				var choice = choices.find(c => c.accepted.includes(react.emoji.name));
				if(choice) return res({...choice, react});
				else return res({choice: 'invalid', react, msg: 'Invalid choice'});
			}

			function intListener(intr) {
				if(!intr.isButton()) return;
				if(intr.channelId !== msg.channel.id ||
				   intr.user.id !== user.id) return;

				clearTimeout(timeout);
				bot.removeListener('messageCreate', msgListener);
				bot.removeListener('messageReactionAdd', reactListener);
				bot.removeListener('interactionCreate', intListener)
				var choice = choices.find(c => c.accepted.includes(intr.customId));
				if(choice) return res({...choice, interaction: intr});
				else return res({choice: 'invalid', interaction: intr, msg: 'Invalid choice'});
			}

			const timeout = setTimeout(async () => {
				bot.removeListener('messageCreate', msgListener);
				bot.removeListener('messageReactionAdd', reactListener);
				bot.removeListener('interactionCreate', intListener)
				res({choice: 'none', msg: 'Action timed out'})
			}, 30000);

			bot.on('messageCreate', msgListener);
			bot.on('messageReactionAdd', reactListener);
			bot.on('interactionCreate', intListener)
		})
	},

	async awaitMessage(bot, msg, user, time) {
		return new Promise(res => {
			function msgListener(message) {
				if(message.channel.id != msg.channel.id ||
				   message.author.id != user.id) return;

				bot.removeListener('messageCreate', msgListener);
				clearTimeout(timeout);
				return res(message)
			}

			const timeout = setTimeout(async () => {
				bot.removeListener('messageCreate', msgListener);
				res('ERR! Timed out!')
			}, time ?? 30000);

			bot.on('messageCreate', msgListener);
		})
	},

	async awaitSelection(ctx, choices, msg, options = {min_values: 1, max_values: 1, placeholder: '- - -'}, ephemeral) {
		var components = [{
			type: 3,
			custom_id: 'selector',
			options: choices,
			...options
		}]

		var reply;
		if(ctx.replied || ctx.deferred) {
			reply = await ctx.followUp({
				content: msg,
				components: [{
					type: 1,
					components
				}],
				ephemeral
			});
		} else {
			reply = await ctx.reply({
				content: msg,
				components: [{
					type: 1,
					components
				}],
				fetchReply: true,
				ephemeral
			});
		}

		try {
			var resp = await reply.awaitMessageComponent({
				filter: (intr) => intr.user.id == ctx.user.id && intr.customId == 'selector',
				time: 60000
			});
		} catch(e) { }
		if(!resp) return 'Nothing selected!';
		await resp.update({
			components: [{
				type: 1,
				components: components.map(c => ({
					...c,
					disabled: true,
					options: choices.map(ch => ({...ch, default: resp.values.includes(ch.value)}))
				}))
			}]
		});

		return resp.values;
	},

	async awaitModal(ctx, data, user, ephemeral = false, time = 30000) {
		return new Promise(async res => {
			await ctx.showModal(data);
			
			async function modListener(m) {
				if(!m.isModalSubmit()) return;
				if(!(m.customId == data.custom_id &&
					m.user.id == user.id))
					return;

				clearTimeout(timeout);
				ctx.client.removeListener('interactionCreate', modListener);

				await m.deferReply({ephemeral});
				res(m);
			}

			ctx.client.on("interactionCreate", modListener);
			const timeout = setTimeout(async () => {
				ctx.client.removeListener('interactionCreate', modListener)
				res()
			}, time);
		})
	}
}
