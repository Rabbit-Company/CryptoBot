import { Colors, EmbedBuilder, MessageFlags, type BaseInteraction, type InteractionReplyOptions } from "discord.js";
import type { WhitelistService } from "../services/whitelist.ts";

export const WEBSITE = "https://cryptobal.info";
export const LOGO = "https://cryptobal.info/images/logo.png";

/**
 * Symbols that have an icon uploaded to cryptobal.info. Everything else falls
 * back to the bot logo so embeds never contain a broken image.
 */
const KNOWN_ICONS = new Set([
	"BTC",
	"COMP",
	"DOGE",
	"EOS",
	"LINK",
	"MKR",
	"STORJ",
	"TRX",
	"YFI",
	"AAVE",
	"ATOM",
	"BAT",
	"DASH",
	"DOT",
	"ETC",
	"IOTA",
	"MATIC",
	"XEM",
	"XRP",
	"ZEC",
	"ADA",
	"BCH",
	"EGLD",
	"ETH",
	"LTC",
	"NEO",
	"RVN",
	"UNI",
	"XLM",
	"XTZ",
	"ZIL",
	"ALGO",
	"AVAX",
	"BNB",
	"ENJ",
	"FIL",
	"LUNA",
	"SOL",
	"THETA",
	"VET",
	"XMR",
	"ZRX",
]);

export function thumbnailFor(symbol: string): string {
	const upper = symbol.toUpperCase();
	if (KNOWN_ICONS.has(upper)) return `https://cryptobal.info/images/cryptos/${upper}.png`;
	return LOGO;
}

export function baseEmbed(title: string, thumbnail: string = LOGO): EmbedBuilder {
	return new EmbedBuilder().setColor(Colors.Orange).setTitle(title).setThumbnail(thumbnail).setURL(WEBSITE).setTimestamp(new Date());
}

export function errorEmbed(description: string, thumbnail: string = LOGO): EmbedBuilder {
	return new EmbedBuilder().setColor(Colors.Red).setTitle("ERROR").setThumbnail(thumbnail).setDescription(description).setTimestamp(new Date());
}

export function successEmbed(description: string, thumbnail: string = LOGO): EmbedBuilder {
	return new EmbedBuilder().setColor(Colors.Green).setTitle("SUCCESS").setThumbnail(thumbnail).setDescription(description).setTimestamp(new Date());
}

export function infoEmbed(title: string, description: string, thumbnail: string = LOGO): EmbedBuilder {
	return new EmbedBuilder().setColor(Colors.Yellow).setTitle(title).setThumbnail(thumbnail).setDescription(description).setTimestamp(new Date());
}

/**
 * Replies are ephemeral by default; in whitelisted channels they are visible to everyone.
 */
export function replyOptions(interaction: BaseInteraction, whitelist: WhitelistService, embed: EmbedBuilder): InteractionReplyOptions {
	if (whitelist.isWhitelisted(interaction.channelId)) return { embeds: [embed] };
	return { embeds: [embed], flags: MessageFlags.Ephemeral };
}

/** Always-ephemeral reply, regardless of whitelist (used for errors and personal data). */
export function ephemeral(embed: EmbedBuilder): InteractionReplyOptions {
	return { embeds: [embed], flags: MessageFlags.Ephemeral };
}

/** Footer note when cached rates are older than expected. */
export function staleness(embed: EmbedBuilder, ageSeconds: number | null): EmbedBuilder {
	if (ageSeconds !== null && ageSeconds > 300) {
		embed.setFooter({ text: `Prices may be outdated (last update ${Math.floor(ageSeconds / 60)} min ago)` });
	}
	return embed;
}
