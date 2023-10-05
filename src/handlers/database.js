const fs = require('fs');
const { Pool } = require('pg');

module.exports = async (bot, path) => {
	const db = new Pool();

	await db.query(`
		CREATE TABLE IF NOT EXISTS extras (
			id 		SERIAL PRIMARY KEY,
			key 	TEXT,
			val 	TEXT
		);

		CREATE TABLE IF NOT EXISTS analytics (
			id SERIAL PRIMARY KEY,
			command	TEXT,
			type INTEGER,
			time TIMESTAMP,
			success BOOL
		);

		CREATE OR REPLACE FUNCTION gen_hid() RETURNS TEXT AS
			'select lower(substr(md5(random()::text), 0, 6));'
		LANGUAGE SQL VOLATILE;

		CREATE OR REPLACE FUNCTION find_unique(_tbl regclass) RETURNS TEXT AS $$
			DECLARE nhid TEXT;
			DECLARE res BOOL;
			BEGIN
				LOOP
					nhid := gen_hid();
					EXECUTE format(
						'SELECT (EXISTS (
							SELECT FROM %s
							WHERE hid = %L
						))::bool',
						_tbl, nhid
					) INTO res;
					IF NOT res THEN RETURN nhid; END IF;
				END LOOP;
			END
		$$ LANGUAGE PLPGSQL VOLATILE;
	`)

	var stores = {};
	var files = fs.readdirSync(path);
	for(var file of files) {
		if(!file.endsWith('.js')) continue;
		var name = file.replace(/\.js/i, "");
		stores[name] = require(path+'/'+file)(bot, db);
		if(stores[name].init) await stores[name].init();
	}

	try {
		files = fs.readdirSync(path + '/migrations');
		files = files.sort((a, b) => {
			a = parseInt(a.slice(0, -3));
			b = parseInt(b.slice(0, -3));

			return a - b;
		})

		var version = parseInt((await db.query(`SELECT * FROM extras WHERE key = 'version'`)).rows[0]?.val || -1);
		if(files.length > version + 1) {
			for(var i = version + 1; i < files.length; i++) {
				if(!files[i]) continue;
				var migration = require(`${path}/migrations/${files[i]}`);
				try {
					await migration(bot, db);
				} catch(e) {
					console.log(e);
					process.exit(1);
				}

				if(version == -1) await db.query(`INSERT INTO extras (key, val) VALUES ('version', 0)`);
				else await db.query(`UPDATE extras SET val = $1 WHERE key = 'version'`, [i]);
			}
		}
	} catch(e) {
		console.error(e);
	}

	return { db, stores };
}
