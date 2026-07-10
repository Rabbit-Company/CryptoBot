import type { AutocompleteInteraction } from "discord.js";
import { Logger } from "../logger.ts";
import type { ConversionService } from "../services/conversion.ts";

/** Shown first when the user hasn't typed anything yet. */
const POPULAR_CRYPTOS = [
	"BTC",
	"ETH",
	"BNB",
	"SOL",
	"XRP",
	"ADA",
	"DOGE",
	"TRX",
	"DOT",
	"LTC",
	"LINK",
	"XMR",
	"AVAX",
	"MATIC",
	"XLM",
	"ATOM",
	"ETC",
	"UNI",
	"FIL",
	"ALGO",
];
const POPULAR_FIATS = [
	"USD",
	"EUR",
	"GBP",
	"CNY",
	"JPY",
	"INR",
	"CAD",
	"AUD",
	"CHF",
	"PLN",
	"CZK",
	"SEK",
	"NOK",
	"TRY",
	"BRL",
	"MXN",
	"KRW",
	"ZAR",
	"HKD",
	"SGD",
];

/**
 * Discord autocomplete must be answered within 3 seconds; everything here is
 * served from the in-memory rate caches so it's effectively instant.
 */
export async function handleAutocomplete(interaction: AutocompleteInteraction, conversion: ConversionService): Promise<void> {
	const focused = interaction.options.getFocused(true);
	const query = focused.value.trim().toUpperCase();

	let pool: string[];
	let popular: string[];

	if (focused.name === "symbol") {
		// crypto only (/price, /address set, /address remove)
		pool = conversion.getCryptoSymbols();
		popular = POPULAR_CRYPTOS;
	} else if (focused.name === "currency") {
		// fiat only (/price currency)
		pool = conversion.getFiatSymbols();
		popular = POPULAR_FIATS;
	} else {
		// crypto + fiat (/convert from/to)
		pool = conversion.getAllSymbols();
		popular = [...POPULAR_CRYPTOS.slice(0, 10), ...POPULAR_FIATS.slice(0, 10)];
	}

	const matches = filterSymbols(pool, popular, query);

	try {
		await interaction.respond(matches.map((symbol) => ({ name: symbol, value: symbol })));
	} catch (err: any) {
		// Autocomplete tokens expire quickly; a failed respond is not critical.
		Logger.debug(`Autocomplete respond failed: ${err?.message ?? err}`);
	}
}

function filterSymbols(pool: string[], popular: string[], query: string): string[] {
	if (!query) {
		const available = new Set(pool);
		const result = popular.filter((symbol) => available.has(symbol));
		return result.length > 0 ? result.slice(0, 25) : pool.slice(0, 25);
	}

	const exact: string[] = [];
	const prefix: string[] = [];
	const contains: string[] = [];

	for (const symbol of pool) {
		if (symbol === query) exact.push(symbol);
		else if (symbol.startsWith(query)) prefix.push(symbol);
		else if (symbol.includes(query)) contains.push(symbol);
	}

	prefix.sort((a, b) => a.length - b.length || a.localeCompare(b));
	contains.sort((a, b) => a.length - b.length || a.localeCompare(b));

	return [...exact, ...prefix, ...contains].slice(0, 25);
}
