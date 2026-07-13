import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type ChatInputCommandInteraction } from "discord.js";
import type { WhitelistService } from "../services/whitelist.ts";
import { baseEmbed, replyOptions } from "../utils/embeds.ts";

const VOTE_SITES: { label: string; url: string }[] = [
	{ label: "Top.gg", url: "https://top.gg/bot/953953187394617354/vote" },
	{ label: "Discord Bot List", url: "https://discordbotlist.com/bots/cryptobot-6053/upvote" },
	{ label: "Discords", url: "https://discords.com/bots/bot/953953187394617354/vote" },
	{ label: "Discord Extreme List", url: "https://discordextremelist.xyz/en-US/bots/cryptobot" },
	{ label: "Dlist.space", url: "https://dlist.space/bot/953953187394617354/vote" },
	{ label: "Radarcord", url: "https://radar.cpdv.net/bot/953953187394617354" },
	{ label: "Disq.ink", url: "https://disq.ink/bot/953953187394617354" },
];

export async function handleHelp(interaction: ChatInputCommandInteraction, whitelist: WhitelistService): Promise<void> {
	const embed = baseEmbed("CryptoBot Help").setDescription(
		[
			"Live prices for **2500+ cryptos** and **160+ fiat currencies**, plus crypto donation lists.",
			"### 📈 Prices",
			[
				"`/price [symbol]` - current price of a crypto",
				"`/price [symbol] [amount] [currency]` - fiat value of your holdings",
				"`/convert [amount] [from] [to]` - convert between any crypto and fiat",
			].join("\n"),
			"### 💝 Donations",
			[
				"`/address set [symbol] [address]` - add an address to your donation list",
				"`/address remove [symbol]` - remove an address",
				"`/address list` - view your own addresses",
				"`/donate [user]` - view someone's donation list",
			].join("\n"),
			"### ⚙️ Server & Misc",
			[
				"`/whitelist add [channel]` - public replies in a channel *(admin)*",
				"`/whitelist remove [channel]` - back to private replies *(admin)*",
				"`/vote` - support the bot with daily voting",
				"`/privacy` - privacy policy",
			].join("\n"),
		].join("\n\n"),
	);

	await interaction.reply(replyOptions(interaction, whitelist, embed));
}

export async function handleVote(interaction: ChatInputCommandInteraction, whitelist: WhitelistService): Promise<void> {
	const embed = baseEmbed("CryptoBot Vote").setDescription(
		"Support CryptoBot by voting daily. It helps more people discover the bot. Pick any site below (or all of them 🧡):",
	);

	const rows: ActionRowBuilder<ButtonBuilder>[] = [];
	for (let i = 0; i < VOTE_SITES.length; i += 5) {
		rows.push(
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				VOTE_SITES.slice(i, i + 5).map((site) => new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(site.label).setURL(site.url)),
			),
		);
	}

	await interaction.reply({ ...replyOptions(interaction, whitelist, embed), components: rows });
}

export async function handlePrivacy(interaction: ChatInputCommandInteraction, whitelist: WhitelistService): Promise<void> {
	const embed = baseEmbed("CryptoBot Privacy Policy").setDescription(
		[
			"At Rabbit Company, we highly prioritize user privacy. By default, CryptoBot collects **no data at all**.",
			"### 📦 What we collect",
			"Only your Discord user ID and the crypto addresses you manually submit via `/address set`. Nothing is stored unless you opt in by creating a donation list.",
			"### 🎯 Why & how it's used",
			"Solely to build and display your donation list when someone runs `/donate` on you. It's never used for anything else.",
			"### 🔐 Who has access",
			"Discord and Rabbit Company.",
			"### 🗑️ Deleting your data",
			"Remove addresses anytime with `/address remove` (see what's stored with `/address list`), or contact us to wipe everything.",
			"### ✉️ Contact",
			"Email: info@rabbit-company.com\nDiscord: https://discord.rabbit-company.com",
		].join("\n\n"),
	);

	await interaction.reply(replyOptions(interaction, whitelist, embed));
}
