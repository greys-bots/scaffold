import { inspect } from 'util';

export class DataStore {
	bot;
	db;

	constructor(bot, db) {
		this.bot = bot;
		this.db = db;
	}

	[inspect.custom](depth, opts) {
		var {bot, db, ...rest} = this;

		return rest;
	}

	async create(data) { }

	async get(data) { }
	async getID(id) { }
	async getAll(id) { }

	async update(id) { }

	async delete(data) { }
	async deleteAll(data) { }
}

export default DataStore;