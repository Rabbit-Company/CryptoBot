import { Database } from "bun:sqlite";
import { existsSync, readFileSync, renameSync } from "node:fs";
import { Logger } from "../logger.ts";

export function openDatabase(path: string = "./data/cryptobot.db"): Database {
	const db = new Database(path, { create: true });
	db.run("PRAGMA journal_mode = WAL;");
	db.run("PRAGMA foreign_keys = ON;");

	db.run(`
		CREATE TABLE IF NOT EXISTS addresses (
			user_id TEXT NOT NULL,
			symbol TEXT NOT NULL,
			address TEXT NOT NULL,
			updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
			PRIMARY KEY (user_id, symbol)
		);

		CREATE TABLE IF NOT EXISTS whitelist (
			channel_id TEXT PRIMARY KEY,
			added_at INTEGER NOT NULL DEFAULT (unixepoch())
		);
	`);

	migrateLegacyJson(db);
	return db;
}

/**
 * One-time import of the old production users.json / whitelist.json files.
 * After a successful import the file is renamed to *.migrated so it never runs twice.
 */
function migrateLegacyJson(db: Database): void {
	migrateFile("./data/users.json", async (data: unknown) => {
		const users = data as { [userId: string]: { [symbol: string]: string } };
		const insert = db.prepare("INSERT OR IGNORE INTO addresses (user_id, symbol, address) VALUES (?, ?, ?)");
		let count = 0;
		const run = db.transaction(() => {
			for (const [userId, addresses] of Object.entries(users)) {
				if (typeof addresses !== "object" || addresses === null) continue;
				for (const [symbol, address] of Object.entries(addresses)) {
					if (typeof address !== "string") continue;
					insert.run(userId, symbol.toUpperCase(), address);
					count++;
				}
			}
		});
		run();
		Logger.info(`Migrated ${count} donation addresses from users.json to SQLite`);
	});

	migrateFile("./data/whitelist.json", async (data: unknown) => {
		const channels = data as string[];
		if (!Array.isArray(channels)) return;
		const insert = db.prepare("INSERT OR IGNORE INTO whitelist (channel_id) VALUES (?)");
		const run = db.transaction(() => {
			for (const channelId of channels) {
				if (typeof channelId === "string") insert.run(channelId);
			}
		});
		run();
		Logger.info(`Migrated ${channels.length} whitelisted channels from whitelist.json to SQLite`);
	});
}

function migrateFile(path: string, importer: (data: unknown) => void): void {
	if (!existsSync(path)) return;
	try {
		const text = readFileSync(path, "utf-8");
		const data = JSON.parse(text);
		importer(data);
		renameSync(path, path + ".migrated");
	} catch (err: any) {
		Logger.error(`Failed to migrate legacy file '${path}': ${err?.message ?? err}`);
	}
}
