class DataStore {
	bot;
	db;

	constructor(bot, db) {
		this.bot = bot;
		this.db = db;
	}

	async create(data) { }

	async get(data) { }
	async getID(id) { }
	async getAll(id) { }

	async update(id) { }

	async delete(data) { }
	async deleteAll(data) { }
}

module.exports = DataStore;