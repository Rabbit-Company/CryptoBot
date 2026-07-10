const fiatFormatters = new Map<string, Intl.NumberFormat | null>();

/**
 * Format an amount of fiat currency. Uses Intl currency formatting when the
 * currency code is a valid ISO 4217 code, otherwise falls back to "1,234.56 XYZ"
 * (the forex API also exposes codes like XAU/XAG which Intl may not accept).
 */
export function formatFiat(amount: number, currency: string): string {
	let formatter = fiatFormatters.get(currency);
	if (formatter === undefined) {
		try {
			formatter = new Intl.NumberFormat("en-US", { style: "currency", currency });
		} catch {
			formatter = null;
		}
		fiatFormatters.set(currency, formatter);
	}
	if (formatter) return formatter.format(amount);
	return `${plainNumber(amount)} ${currency}`;
}

/**
 * Format an amount of crypto with precision that adapts to the magnitude,
 * so both "2.5 BTC" and "0.00000341 PEPE" display sensibly.
 */
export function formatCrypto(amount: number, symbol: string): string {
	return `${plainNumber(amount)} ${symbol}`;
}

function plainNumber(amount: number): string {
	if (!Number.isFinite(amount)) return String(amount);
	const abs = Math.abs(amount);
	let maximumFractionDigits: number;
	if (abs >= 1000) maximumFractionDigits = 2;
	else if (abs >= 1) maximumFractionDigits = 4;
	else if (abs >= 0.001) maximumFractionDigits = 6;
	else maximumFractionDigits = 10;
	return amount.toLocaleString("en-US", { maximumFractionDigits });
}

/** "0.05 BTC" or "€1,234.56" depending on what kind of currency it is. */
export function formatAmount(amount: number, symbol: string, isFiat: boolean): string {
	return isFiat ? formatFiat(amount, symbol) : formatCrypto(amount, symbol);
}
