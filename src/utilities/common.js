import { readdirSync } from 'fs';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const recursivelyReadDirectory = (dir) => {
	var results = [];
	var files = readdirSync(dir, {withFileTypes: true});
	for(let file of files) {
		if(file.isDirectory()) {
			results = results.concat(recursivelyReadDirectory(dir+"/"+file.name));
		} else {
			results.push(dir+"/"+file.name);
		}
	}

	return results;
}

export const genCode = (table, num = 4) => {
	var string = "";
	for(var i = 0; i < num; i++) {
		string += table[Math.floor(Math.random() * (table.length))];
	}

	return string;
}

export const dayDiff = (d1, d2) => {
	d1 = new Date(d1);
	d2 = new Date(d2);
	return Math.ceil((d2.getTime() - d1.getTime()) / DAY);
}

export const checkUrl = (string) => {
	// regex credit: https://stackoverflow.com/a/17773849
	return string.match(/([0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/);
}

export default {
	recursivelyReadDirectory,
	genCode,

	dayDiff,
  checkUrl
}