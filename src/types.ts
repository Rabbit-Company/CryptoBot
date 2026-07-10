export interface FiatExchangeRates {
	base: string;
	rates: {
		[fiatCode: string]: number;
	};
	timestamps: {
		currency: string;
	};
}

export interface CryptoExchangeRates {
	base: string;
	rates: {
		[currencyCode: string]: number;
	};
	timestamps: {
		currency: string;
		crypto: string;
	};
}

export type Rates = { [symbol: string]: number };
