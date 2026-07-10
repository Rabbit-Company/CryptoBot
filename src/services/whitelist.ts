import type { Database, Statement } from "bun:sqlite";
import { Logger } from "../logger.ts";

export class WhitelistService {
	private whitelist: Set<string> = new Set();
	private readonly stmtAdd: Statement;
	private readonly stmtRemove: Statement;
	private readonly stmtAll: Statement;

	constructor(db: Database) {
		this.stmtAdd = db.prepare("INSERT OR IGNORE INTO whitelist (channel_id) VALUES (?)");
		this.stmtRemove = db.prepare("DELETE FROM whitelist WHERE channel_id = ?");
		this.stmtAll = db.prepare("SELECT channel_id FROM whitelist");
		this.load();
	}

	private load(): void {
		const rows = this.stmtAll.all() as { channel_id: string }[];
		this.whitelist = new Set(rows.map((row) => row.channel_id));
		Logger.debug(`Loaded ${this.whitelist.size} whitelisted discord channels from SQLite`);
	}

	isWhitelisted(channelId: string | null | undefined): boolean {
		if (!channelId) return false;
		return this.whitelist.has(channelId);
	}

	add(channelId: string): void {
		this.stmtAdd.run(channelId);
		this.whitelist.add(channelId);
	}

	remove(channelId: string): void {
		this.stmtRemove.run(channelId);
		this.whitelist.delete(channelId);
	}

	getAll(): string[] {
		return Array.from(this.whitelist);
	}
}
