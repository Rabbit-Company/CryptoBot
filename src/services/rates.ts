import { Logger } from "../logger.ts";
import type { Rates } from "../types.ts";

/**
 * Base class for services that periodically fetch exchange rates
 * from RabbitForexAPI (https://docs.forex.rabbitmonitor.com/).
 *
 * Rate semantics (base = USD): rates[SYMBOL] = amount of SYMBOL you get for 1 USD.
 * Example: rates["EUR"] = 0.87 -> 1 USD = 0.87 EUR
 *          rates["BTC"] = 0.00001 -> 1 USD = 0.00001 BTC
 */
export abstract class RatesService {
	protected rates: Rates = {};
	protected lastUpdate: Date | null = null;
	private readonly updateInterval: number;
	private intervalId: ReturnType<typeof setInterval> | null = null;

	constructor(updateInterval: number = 30) {
		this.updateInterval = updateInterval;
	}

	/** Human readable name used in log messages. */
	protected abstract readonly name: string;

	/** Fetch rates from the API. Must return the new rates and their timestamp. */
	protected abstract fetchRates(): Promise<{ rates: Rates; timestamp: Date }>;

	async initialize(): Promise<void> {
		await this.updateRates();
		this.startPeriodicUpdate();
	}

	startPeriodicUpdate(): void {
		if (this.intervalId) return;
		this.intervalId = setInterval(() => {
			this.updateRates();
		}, this.updateInterval * 1000);
	}

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	async updateRates(): Promise<number> {
		try {
			const { rates, timestamp } = await this.fetchRates();
			const currencies = Object.keys(rates);
			if (currencies.length === 0) throw new Error("API returned an empty rates object");

			this.rates = rates;
			this.lastUpdate = timestamp;

			Logger.debug(`Successfully updated ${currencies.length} ${this.name} rates`);
			return currencies.length;
		} catch (err: any) {
			// Keep serving the previously cached rates on failure
			Logger.warn(`Problem with fetching ${this.name} rates from RabbitForexAPI: ${err?.message ?? err}`);
			return 0;
		}
	}

	/** Does this service know the given symbol? */
	has(symbol: string): boolean {
		if (symbol === "USD") return true;
		return typeof this.rates[symbol] === "number" && this.rates[symbol] > 0;
	}

	/** rates[symbol] = amount of `symbol` per 1 USD. */
	getUsdRate(symbol: string): number {
		if (symbol === "USD") return 1;
		const rate = this.rates[symbol];
		if (!rate || rate <= 0) throw new Error(`Unknown currency: ${symbol}`);
		return rate;
	}

	/** Convert an amount of `symbol` into USD. */
	toUSD(amount: number, symbol: string): number {
		return amount / this.getUsdRate(symbol);
	}

	/** Convert an amount of USD into `symbol`. */
	fromUSD(amount: number, symbol: string): number {
		return amount * this.getUsdRate(symbol);
	}

	convert(amount: number, fromCurrency: string, toCurrency: string): number {
		if (fromCurrency === toCurrency) return amount;
		return this.fromUSD(this.toUSD(amount, fromCurrency), toCurrency);
	}

	getRate(fromCurrency: string, toCurrency: string): number {
		return this.convert(1, fromCurrency, toCurrency);
	}

	getSupportedCurrencies(): string[] {
		return Object.keys(this.rates);
	}

	getLastUpdate(): Date | null {
		return this.lastUpdate;
	}

	/** Age of the cached rates in seconds, or null if never updated. */
	getAgeSeconds(): number | null {
		if (!this.lastUpdate) return null;
		return Math.floor((Date.now() - this.lastUpdate.getTime()) / 1000);
	}
}
