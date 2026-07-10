import type { Database, Statement } from "bun:sqlite";

export interface DonationAddress {
	symbol: string;
	address: string;
}

export class UserService {
	private readonly stmtSet: Statement;
	private readonly stmtRemove: Statement;
	private readonly stmtGet: Statement;
	private readonly stmtGetAll: Statement;
	private readonly stmtDeleteAll: Statement;

	constructor(db: Database) {
		this.stmtSet = db.prepare(`
			INSERT INTO addresses (user_id, symbol, address, updated_at)
			VALUES (?, ?, ?, unixepoch())
			ON CONFLICT (user_id, symbol) DO UPDATE SET address = excluded.address, updated_at = unixepoch()
		`);
		this.stmtRemove = db.prepare("DELETE FROM addresses WHERE user_id = ? AND symbol = ?");
		this.stmtGet = db.prepare("SELECT address FROM addresses WHERE user_id = ? AND symbol = ?");
		this.stmtGetAll = db.prepare("SELECT symbol, address FROM addresses WHERE user_id = ? ORDER BY symbol ASC");
		this.stmtDeleteAll = db.prepare("DELETE FROM addresses WHERE user_id = ?");
	}

	setAddress(userId: string, symbol: string, address: string): void {
		this.stmtSet.run(userId, symbol.toUpperCase(), address);
	}

	/** @returns true when an address existed and was removed. */
	removeAddress(userId: string, symbol: string): boolean {
		const existed = this.hasAddress(userId, symbol);
		if (existed) this.stmtRemove.run(userId, symbol.toUpperCase());
		return existed;
	}

	hasAddress(userId: string, symbol: string): boolean {
		return this.stmtGet.get(userId, symbol.toUpperCase()) !== null;
	}

	getAddresses(userId: string): DonationAddress[] {
		return this.stmtGetAll.all(userId) as DonationAddress[];
	}

	/** GDPR helper: wipe everything stored for a user. */
	removeAllAddresses(userId: string): void {
		this.stmtDeleteAll.run(userId);
	}
}
