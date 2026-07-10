import type { FiatExchangeRates, Rates } from "../types.ts";
import { RatesService } from "./rates.ts";

export class FiatService extends RatesService {
	protected readonly name = "fiat";

	protected async fetchRates(): Promise<{ rates: Rates; timestamp: Date }> {
		const response = await fetch("https://forex.rabbitmonitor.com/v1/rates/USD", { signal: AbortSignal.timeout(5000) });
		if (!response.ok) throw new Error(`API responded with HTTP ${response.status}`);
		const data = (await response.json()) as FiatExchangeRates;
		const rates: Rates = { USD: 1, ...data.rates };
		return { rates, timestamp: new Date(data.timestamps.currency) };
	}
}
