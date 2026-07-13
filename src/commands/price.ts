import type { ChatInputCommandInteraction } from "discord.js";
import type { ConversionService } from "../services/conversion.ts";
import type { WhitelistService } from "../services/whitelist.ts";
import { baseEmbed, ephemeral, errorEmbed, replyOptions, staleness, thumbnailFor } from "../utils/embeds.ts";
import { formatAmount, formatCrypto, formatFiat } from "../utils/format.ts";

export async function handlePrice(interaction: ChatInputCommandInteraction, conversion: ConversionService, whitelist: WhitelistService): Promise<void> {
	const symbol = interaction.options.getString("symbol", true).trim().toUpperCase();
	const amount = interaction.options.getNumber("amount") ?? 1;
	const currency = (interaction.options.getString("currency") ?? "USD").trim().toUpperCase();

	if (!conversion.isCrypto(symbol)) {
		await interaction.reply(ephemeral(errorEmbed(`**Unknown cryptocurrency \`${symbol}\`.** Use the autocomplete suggestions to pick a supported symbol.`)));
		return;
	}
	if (!conversion.isFiat(currency)) {
		await interaction.reply(ephemeral(errorEmbed(`**Unknown fiat currency \`${currency}\`.** Use the autocomplete suggestions to pick a supported currency.`)));
		return;
	}

	const value = conversion.convert(amount, symbol, currency);

	const embed = baseEmbed(amount === 1 ? `${symbol} price` : `${symbol} calculator`, thumbnailFor(symbol));
	if (amount === 1) {
		embed.setDescription(
			[`# ${formatFiat(value, currency)}`, `-# 1 ${currency} = ${formatCrypto(conversion.convert(1, currency, symbol), symbol)}`].join("\n"),
		);
	} else {
		embed.setDescription(
			[
				`# ${formatCrypto(amount, symbol)} = ${formatFiat(value, currency)}`,
				`-# 1 ${symbol} = ${formatFiat(conversion.getPrice(symbol, currency), currency)}`,
			].join("\n"),
		);
	}
	staleness(embed, conversion.getAgeSeconds());

	await interaction.reply(replyOptions(interaction, whitelist, embed));
}

export async function handleConvert(interaction: ChatInputCommandInteraction, conversion: ConversionService, whitelist: WhitelistService): Promise<void> {
	const amount = interaction.options.getNumber("amount", true);
	const from = interaction.options.getString("from", true).trim().toUpperCase();
	const to = interaction.options.getString("to", true).trim().toUpperCase();

	for (const symbol of [from, to]) {
		if (!conversion.isKnown(symbol)) {
			await interaction.reply(
				ephemeral(errorEmbed(`**Unknown currency \`${symbol}\`.** Use the autocomplete suggestions to pick a supported crypto or fiat currency.`)),
			);
			return;
		}
	}

	const value = conversion.convert(amount, from, to);
	const thumbnail = conversion.isCrypto(from) ? thumbnailFor(from) : conversion.isCrypto(to) ? thumbnailFor(to) : undefined;

	const embed = baseEmbed(`${from} → ${to}`, thumbnail).setDescription(
		[
			`# ${formatAmount(amount, from, conversion.isFiat(from))} = ${formatAmount(value, to, conversion.isFiat(to))}`,
			`-# 1 ${from} = ${formatAmount(conversion.getPrice(from, to), to, conversion.isFiat(to))}`,
		].join("\n"),
	);
	staleness(embed, conversion.getAgeSeconds());

	await interaction.reply(replyOptions(interaction, whitelist, embed));
}
