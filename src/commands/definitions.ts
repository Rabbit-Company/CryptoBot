import { ChannelType, PermissionFlagsBits, SlashCommandBuilder, type RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";

export const commandDefinitions: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
	new SlashCommandBuilder().setName("help").setDescription("Show all commands."),

	new SlashCommandBuilder().setName("vote").setDescription("Support the bot with daily voting"),

	new SlashCommandBuilder().setName("privacy").setDescription("Show Privacy Policy"),

	new SlashCommandBuilder()
		.setName("price")
		.setDescription("Show the price of a cryptocurrency")
		.addStringOption((option) => option.setName("symbol").setDescription("Cryptocurrency symbol (e.g. BTC)").setRequired(true).setAutocomplete(true))
		.addNumberOption((option) => option.setName("amount").setDescription("Amount of crypto to price (default: 1)").setMinValue(0).setRequired(false))
		.addStringOption((option) =>
			option.setName("currency").setDescription("Fiat currency to display the price in (default: USD)").setRequired(false).setAutocomplete(true),
		),

	new SlashCommandBuilder()
		.setName("convert")
		.setDescription("Convert between any crypto and fiat currencies")
		.addNumberOption((option) => option.setName("amount").setDescription("Amount to convert").setMinValue(0).setRequired(true))
		.addStringOption((option) => option.setName("from").setDescription("Currency to convert from (crypto or fiat)").setRequired(true).setAutocomplete(true))
		.addStringOption((option) => option.setName("to").setDescription("Currency to convert to (crypto or fiat)").setRequired(true).setAutocomplete(true)),

	new SlashCommandBuilder()
		.setName("address")
		.setDescription("Manage your crypto donation addresses")
		.addSubcommand((sub) =>
			sub
				.setName("set")
				.setDescription("Set a crypto address to accept donations.")
				.addStringOption((option) => option.setName("symbol").setDescription("Cryptocurrency symbol (e.g. BTC)").setRequired(true).setAutocomplete(true))
				.addStringOption((option) =>
					option.setName("address").setDescription("Your wallet address for this cryptocurrency.").setRequired(true).setMinLength(15).setMaxLength(128),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName("remove")
				.setDescription("Remove a crypto address from your donation list.")
				.addStringOption((option) => option.setName("symbol").setDescription("Cryptocurrency symbol (e.g. BTC)").setRequired(true).setAutocomplete(true)),
		)
		.addSubcommand((sub) => sub.setName("list").setDescription("Show your own donation addresses.")),

	new SlashCommandBuilder()
		.setName("donate")
		.setDescription("Show crypto addresses from your friends for a donation.")
		.addUserOption((option) => option.setName("to").setDescription("Display crypto addresses from a specific person.").setRequired(true)),

	new SlashCommandBuilder()
		.setName("whitelist")
		.setDescription("Command outputs in whitelisted channels are visible to everyone.")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand((sub) =>
			sub
				.setName("add")
				.setDescription("Add channel to the whitelist.")
				.addChannelOption((option) =>
					option
						.setName("channel")
						.setDescription("Add channel to the whitelist.")
						.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
						.setRequired(true),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName("remove")
				.setDescription("Remove channel from the whitelist.")
				.addChannelOption((option) =>
					option
						.setName("channel")
						.setDescription("Remove channel from the whitelist.")
						.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
						.setRequired(true),
				),
		),
].map((builder) => builder.toJSON());
