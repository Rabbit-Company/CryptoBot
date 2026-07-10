import { PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import type { WhitelistService } from "../services/whitelist.ts";
import { ephemeral, errorEmbed, infoEmbed, successEmbed } from "../utils/embeds.ts";

export async function handleWhitelist(interaction: ChatInputCommandInteraction, whitelist: WhitelistService): Promise<void> {
	const action = interaction.options.getSubcommand();
	const channel = interaction.options.getChannel("channel", true);

	// Defence in depth: the command already requires Administrator via
	// setDefaultMemberPermissions, but server owners can override that in settings.
	if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
		await interaction.reply(
			ephemeral(errorEmbed(`**You don't have permission to ${action} this channel ${action === "add" ? "to" : "from"} the whitelist.**`)),
		);
		return;
	}

	if (action === "add") {
		if (whitelist.isWhitelisted(channel.id)) {
			await interaction.reply(ephemeral(infoEmbed("INFO", "**This channel is already on the whitelist.**")));
			return;
		}
		whitelist.add(channel.id);
		await interaction.reply(ephemeral(successEmbed("**Channel has been whitelisted successfully.**")));
		return;
	}

	if (action === "remove") {
		if (!whitelist.isWhitelisted(channel.id)) {
			await interaction.reply(ephemeral(infoEmbed("INFO", "**This channel is not on the whitelist.**")));
			return;
		}
		whitelist.remove(channel.id);
		await interaction.reply(ephemeral(successEmbed("**Channel has been removed from whitelist successfully.**")));
	}
}
