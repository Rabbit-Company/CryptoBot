import { Colors, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { Logger } from "../logger.ts";
import type { ConversionService } from "../services/conversion.ts";
import type { UserService } from "../services/users.ts";
import type { WhitelistService } from "../services/whitelist.ts";
import { baseEmbed, ephemeral, errorEmbed, infoEmbed, replyOptions, successEmbed, thumbnailFor } from "../utils/embeds.ts";

function isValidAddress(address: string): boolean {
	return address.length >= 15 && address.length <= 128 && /^[A-Za-z0-9:_-]+$/.test(address);
}

export async function handleAddress(interaction: ChatInputCommandInteraction, conversion: ConversionService, users: UserService): Promise<void> {
	const action = interaction.options.getSubcommand();

	if (action === "set") {
		const symbol = interaction.options.getString("symbol", true).trim().toUpperCase();
		const address = interaction.options.getString("address", true).trim();

		if (!conversion.isCrypto(symbol)) {
			await interaction.reply(ephemeral(errorEmbed(`**Unknown cryptocurrency \`${symbol}\`.** Use the autocomplete suggestions to pick a supported symbol.`)));
			return;
		}
		if (!isValidAddress(address)) {
			await interaction.reply(ephemeral(errorEmbed(`**Inputed ${symbol} address is not valid!**`, thumbnailFor(symbol))));
			return;
		}

		if (!users.hasAddress(interaction.user.id, symbol) && users.getAddresses(interaction.user.id).length >= 25) {
			await interaction.reply(
				ephemeral(
					errorEmbed(
						"**You have reached the maximum of 25 donation addresses.**\nRemove one with **/address remove** before adding a new one.",
						thumbnailFor(symbol),
					),
				),
			);
			return;
		}

		users.setAddress(interaction.user.id, symbol, address);
		await interaction.reply(ephemeral(successEmbed(`**${symbol} donation address has been set successfully.**`, thumbnailFor(symbol))));
		return;
	}

	if (action === "remove") {
		const symbol = interaction.options.getString("symbol", true).trim().toUpperCase();
		const removed = users.removeAddress(interaction.user.id, symbol);

		if (!removed) {
			await interaction.reply(
				ephemeral(infoEmbed("No action required", `**${symbol} address for donations has already been removed.**`, thumbnailFor(symbol))),
			);
			return;
		}

		await interaction.reply(ephemeral(successEmbed(`**${symbol} donation address has been removed successfully.**`, thumbnailFor(symbol))));
		return;
	}

	if (action === "list") {
		const addresses = users.getAddresses(interaction.user.id);
		const embed = baseEmbed("Your donation addresses");

		if (addresses.length === 0) {
			embed.setDescription(
				"You haven't set any donation addresses yet.\n\nAdd one with **/address set** — it will then show up when someone runs **/donate** on you.",
			);
		} else {
			embed.setDescription(
				`You have **${addresses.length}/25** ${addresses.length === 1 ? "address" : "addresses"} set. These are shown to anyone who runs **/donate** on you.`,
			);
			embed.addFields(
				addresses.slice(0, 25).map(({ symbol, address }) => ({
					name: symbol,
					value: `\`\`\`${address}\`\`\``,
					inline: false,
				})),
			);
			embed.setFooter({ text: "Tap an address to copy it" });
		}

		await interaction.reply(ephemeral(embed));
	}
}

export async function handleDonate(interaction: ChatInputCommandInteraction, users: UserService, whitelist: WhitelistService): Promise<void> {
	const user = interaction.options.getUser("to", true);

	// Accent color is only available on force-fetched users; fall back to orange.
	let color: number = Colors.Orange;
	try {
		const fetched = await user.fetch();
		if (fetched.accentColor) color = fetched.accentColor;
	} catch (err: any) {
		Logger.debug(`Could not fetch accent color for user ${user.id}: ${err?.message ?? err}`);
	}

	const embed = new EmbedBuilder()
		.setColor(color)
		.setAuthor({ name: `Donate to ${user.displayName}`, iconURL: user.displayAvatarURL() })
		.setThumbnail(user.displayAvatarURL({ size: 256 }))
		.setTimestamp(new Date());

	const addresses = users.getAddresses(user.id);
	if (addresses.length > 0) {
		embed.setDescription(`**${user.username}** accepts donations in **${addresses.length}** ${addresses.length === 1 ? "currency" : "currencies"}:`);
		embed.addFields(
			addresses.slice(0, 25).map(({ symbol, address }) => ({
				name: `${symbol}`,
				value: `\`\`\`${address}\`\`\``,
				inline: false,
			})),
		);
		embed.setFooter({ text: "Tap an address to copy it • Always verify before sending" });
	} else {
		embed.setDescription(
			`**${user.username}** hasn't set up a donation list yet.\n\nThey can add addresses with **/address set** - feel free to give them a nudge. 🙂`,
		);
	}

	await interaction.reply(replyOptions(interaction, whitelist, embed));
}
