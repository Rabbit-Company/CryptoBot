import type { ChatInputCommandInteraction } from "discord.js";
import type { WhitelistService } from "../services/whitelist.ts";
import { baseEmbed, replyOptions } from "../utils/embeds.ts";

export async function handleHelp(interaction: ChatInputCommandInteraction, whitelist: WhitelistService): Promise<void> {
	const embed = baseEmbed("CryptoBot Help").addFields([
		{ name: "/price [symbol]", value: "Show price of a specific crypto (2500+ supported)", inline: false },
		{ name: "/price [symbol] [amount] [currency]", value: "Calculate the fiat value of a specific amount of crypto assets", inline: false },
		{ name: "/convert [amount] [from] [to]", value: "Convert between any crypto and fiat currencies", inline: false },
		{ name: "/address set [symbol] [address]", value: "Set crypto address in your donation list", inline: false },
		{ name: "/address remove [symbol]", value: "Remove crypto address from your donation list", inline: false },
		{ name: "/address list", value: "Show your own donation addresses", inline: false },
		{ name: "/donate [user]", value: "Show donation list from a specific user", inline: false },
		{ name: "/whitelist add [channel]", value: "Add channel to the whitelist", inline: false },
		{ name: "/whitelist remove [channel]", value: "Remove channel from the whitelist", inline: false },
		{ name: "/vote", value: "Support the bot with daily voting", inline: false },
		{ name: "/privacy", value: "Show Privacy Policy", inline: false },
	]);

	await interaction.reply(replyOptions(interaction, whitelist, embed));
}

export async function handleVote(interaction: ChatInputCommandInteraction, whitelist: WhitelistService): Promise<void> {
	const embed = baseEmbed("CryptoBot Vote")
		.setDescription("Support the bot with daily voting.")
		.addFields([
			{ name: "TOP GG", value: "https://top.gg/bot/953953187394617354/vote", inline: false },
			{ name: "Discord Bot List", value: "https://discordbotlist.com/bots/cryptobot-6053/upvote", inline: false },
			{ name: "Discords", value: "https://discords.com/bots/bot/953953187394617354/vote", inline: false },
			{ name: "Discord Extreme List", value: "https://discordextremelist.xyz/en-US/bots/cryptobot", inline: false },
		]);

	await interaction.reply(replyOptions(interaction, whitelist, embed));
}

export async function handlePrivacy(interaction: ChatInputCommandInteraction, whitelist: WhitelistService): Promise<void> {
	const embed = baseEmbed("CryptoBot Privacy Policy")
		.setDescription("We at Rabbit Company, highly prioritize user's privacy.")
		.addFields([
			{ name: "What data does CryptoBot collect?", value: "CryptoBot only collects your user id and manually submitted crypto addresses.", inline: false },
			{
				name: "Why do we collect data?",
				value:
					"By default we don't collect any data. If the user wants to create their own donation list, provided crypto addresses and user IDs (as identifiers) would be stored on our servers.",
				inline: false,
			},
			{ name: "How do we use collected data?", value: "Data is used for the creation of donation lists.", inline: false },
			{ name: "Who does hold / have access to collected data?", value: "Discord and Rabbit Company.", inline: false },
			{
				name: "How can users contact us, if they have any concerns about the bot?",
				value: "Thru Email: info@rabbit-company.com or Discord: https://discord.rabbit-company.com",
				inline: false,
			},
			{ name: "How can users remove collected data?", value: "Collected data can be removed with provided commands or by contacting us.", inline: false },
		]);

	await interaction.reply(replyOptions(interaction, whitelist, embed));
}
