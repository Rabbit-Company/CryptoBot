import type { CryptoExchangeRates, Rates } from "../types.ts";
import { RatesService } from "./rates.ts";

export class CryptoService extends RatesService {
	protected readonly name = "crypto";

	protected async fetchRates(): Promise<{ rates: Rates; timestamp: Date }> {
		const response = await fetch("https://forex.rabbitmonitor.com/v1/crypto/rates/USD", { signal: AbortSignal.timeout(5000) });
		if (!response.ok) throw new Error(`API responded with HTTP ${response.status}`);
		const data = (await response.json()) as CryptoExchangeRates;
		return { rates: data.rates, timestamp: new Date(data.timestamps.crypto) };
	}
}
