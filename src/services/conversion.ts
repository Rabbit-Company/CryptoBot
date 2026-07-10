import type { CryptoService } from "./crypto.ts";
import type { FiatService } from "./fiat.ts";

/**
 * Composes CryptoService + FiatService so command handlers can convert
 * between any combination of crypto and fiat currencies through USD.
 */
export class ConversionService {
	constructor(
		private readonly cryptoService: CryptoService,
		private readonly fiatService: FiatService,
	) {}

	isCrypto(symbol: string): boolean {
		// USD is handled by the fiat service; don't let it shadow a crypto lookup.
		if (symbol === "USD") return false;
		return this.cryptoService.has(symbol);
	}

	isFiat(symbol: string): boolean {
		return this.fiatService.has(symbol);
	}

	isKnown(symbol: string): boolean {
		return this.isCrypto(symbol) || this.isFiat(symbol);
	}

	private toUSD(amount: number, symbol: string): number {
		if (symbol === "USD") return amount;
		if (this.isCrypto(symbol)) return this.cryptoService.toUSD(amount, symbol);
		if (this.isFiat(symbol)) return this.fiatService.toUSD(amount, symbol);
		throw new Error(`Unknown currency: ${symbol}`);
	}

	private fromUSD(amount: number, symbol: string): number {
		if (symbol === "USD") return amount;
		if (this.isCrypto(symbol)) return this.cryptoService.fromUSD(amount, symbol);
		if (this.isFiat(symbol)) return this.fiatService.fromUSD(amount, symbol);
		throw new Error(`Unknown currency: ${symbol}`);
	}

	/** Convert between any two supported currencies (crypto or fiat). */
	convert(amount: number, fromCurrency: string, toCurrency: string): number {
		if (fromCurrency === toCurrency) return amount;
		return this.fromUSD(this.toUSD(amount, fromCurrency), toCurrency);
	}

	/** Price of 1 unit of `symbol` expressed in `currency`. */
	getPrice(symbol: string, currency: string = "USD"): number {
		return this.convert(1, symbol, currency);
	}

	getCryptoSymbols(): string[] {
		return this.cryptoService.getSupportedCurrencies();
	}

	getFiatSymbols(): string[] {
		return this.fiatService.getSupportedCurrencies();
	}

	getAllSymbols(): string[] {
		return [...new Set([...this.getCryptoSymbols(), ...this.getFiatSymbols()])];
	}

	/** Age of the oldest relevant rate cache in seconds (worst case), or null. */
	getAgeSeconds(): number | null {
		const crypto = this.cryptoService.getAgeSeconds();
		const fiat = this.fiatService.getAgeSeconds();
		if (crypto === null && fiat === null) return null;
		return Math.max(crypto ?? 0, fiat ?? 0);
	}
}
