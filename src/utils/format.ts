const fiatFormatters = new Map<string, Intl.NumberFormat | null>();

/** How many significant digits to show for small values. */
const SMALL_VALUE_SIG_DIGITS = 4;

/** More decimals for tiny fiat values so sub-cent prices don't collapse to $0.00. */
function fiatFractionDigits(amount: number): number | undefined {
	const abs = Math.abs(amount);
	if (abs === 0 || abs >= 0.1) return undefined; // currency's default (e.g. 2 for USD)
	if (abs >= 0.001) return 6;
	return 10;
}

/**
 * Format an amount of fiat currency. Uses Intl currency formatting when the
 * currency code is a valid ISO 4217 code, otherwise falls back to "1,234.56 XYZ"
 * (the forex API also exposes codes like XAU/XAG which Intl may not accept).
 *
 * Values below 0.1 switch to significant-digit precision, so sub-cent prices
 * always show exactly 4 meaningful digits no matter how many leading zeros:
 *   $0.03412   $0.004269   $0.000003413
 */
export function formatFiat(amount: number, currency: string): string {
	const useSigDigits = amount !== 0 && Math.abs(amount) < 0.1;
	const key = `${currency}:${useSigDigits ? "sig" : "std"}`;

	let formatter = fiatFormatters.get(key);
	if (formatter === undefined) {
		try {
			formatter = new Intl.NumberFormat("en-US", {
				style: "currency",
				currency,
				...(useSigDigits && { maximumSignificantDigits: SMALL_VALUE_SIG_DIGITS }),
			});
		} catch {
			formatter = null;
		}
		fiatFormatters.set(key, formatter);
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

	// Small values: fixed number of significant digits, scales to any magnitude.
	if (abs !== 0 && abs < 1) {
		return amount.toLocaleString("en-US", { maximumSignificantDigits: 5 });
	}

	// Large values: fewer decimals the bigger the number gets.
	const maximumFractionDigits = abs >= 1000 ? 2 : 4;
	return amount.toLocaleString("en-US", { maximumFractionDigits });
}

/** "0.05 BTC" or "€1,234.56" depending on what kind of currency it is. */
export function formatAmount(amount: number, symbol: string, isFiat: boolean): string {
	return isFiat ? formatFiat(amount, symbol) : formatCrypto(amount, symbol);
}
