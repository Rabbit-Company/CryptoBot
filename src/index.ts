import { ActivityType, Client, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import { handleAutocomplete } from "./commands/autocomplete.ts";
import { commandDefinitions } from "./commands/definitions.ts";
import { handleAddress, handleDonate } from "./commands/donations.ts";
import { handleHelp, handlePrivacy, handleVote } from "./commands/misc.ts";
import { handleConvert, handlePrice } from "./commands/price.ts";
import { handleWhitelist } from "./commands/whitelist.ts";
import { Logger } from "./logger.ts";
import { ConversionService } from "./services/conversion.ts";
import { CryptoService } from "./services/crypto.ts";
import { openDatabase } from "./services/database.ts";
import { FiatService } from "./services/fiat.ts";
import { UserService } from "./services/users.ts";
import { WhitelistService } from "./services/whitelist.ts";
import { errorEmbed } from "./utils/embeds.ts";

const db = openDatabase("./data/cryptobot.db");
const whitelistService = new WhitelistService(db);
const userService = new UserService(db);
const fiatService = new FiatService(30);
const cryptoService = new CryptoService(30);
const conversionService = new ConversionService(cryptoService, fiatService);

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async (readyClient) => {
	Logger.info("Logged in as " + readyClient.user.tag);

	setPresence();

	await fiatService.initialize();
	await cryptoService.initialize();

	// Bulk-overwrite global commands. This also deletes the old per-crypto
	// commands from the previous bot version (propagation can take up to an hour).
	try {
		const guildID = process.env.dev_guild ?? "";
		const guild = guildID ? readyClient.guilds.cache.get(guildID) : undefined;
		const registered = guild ? await guild.commands.set(commandDefinitions) : await readyClient.application.commands.set(commandDefinitions);
		Logger.info(`Registered ${registered.size} ${guild ? "guild" : "global"} slash commands`);
	} catch (err: any) {
		Logger.error(`Failed to register slash commands: ${err?.message ?? err}`);
	}

	startHourlyTasks();
});

client.on(Events.InteractionCreate, async (interaction) => {
	try {
		if (interaction.isAutocomplete()) {
			await handleAutocomplete(interaction, conversionService);
			return;
		}

		if (!interaction.isChatInputCommand()) return;

		switch (interaction.commandName) {
			case "help":
				await handleHelp(interaction, whitelistService);
				break;
			case "vote":
				await handleVote(interaction, whitelistService);
				break;
			case "privacy":
				await handlePrivacy(interaction, whitelistService);
				break;
			case "price":
				await handlePrice(interaction, conversionService, whitelistService);
				break;
			case "convert":
				await handleConvert(interaction, conversionService, whitelistService);
				break;
			case "address":
				await handleAddress(interaction, conversionService, userService);
				break;
			case "donate":
				await handleDonate(interaction, userService, whitelistService);
				break;
			case "whitelist":
				await handleWhitelist(interaction, whitelistService);
				break;
			default:
				Logger.warn(`Received unknown command: ${interaction.commandName}`);
		}
	} catch (err: any) {
		Logger.error(`Interaction failed: ${err?.stack ?? err}`);
		if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
			await interaction.reply({ embeds: [errorEmbed("**Something went wrong. Please try again.**")], flags: MessageFlags.Ephemeral }).catch(() => {});
		}
	}
});

function setPresence(): void {
	client.user?.setPresence({ status: "online", activities: [{ name: client.guilds.cache.size + " servers", type: ActivityType.Watching }] });
}

function updateVotingSites(): void {
	if (!client.user) return;

	const params = new URLSearchParams();
	params.append("server_count", String(client.guilds.cache.size));

	if (process.env.token_topgg) post("https://top.gg/api/bots/" + client.user.id + "/stats", process.env.token_topgg, params);
	if (process.env.token_discords) post("https://discords.com/bots/api/bot/" + client.user.id, process.env.token_discords, params);

	const params2 = new URLSearchParams();
	params2.append("guilds", String(client.guilds.cache.size));
	params2.append("users", String(client.users.cache.size));

	if (process.env.token_discordbotlist) post("https://discordbotlist.com/api/v1/bots/" + client.user.id + "/stats", process.env.token_discordbotlist, params2);

	if (process.env.token_discordextremelist) {
		fetch("https://api.discordextremelist.xyz/v2/bot/" + client.user.id + "/stats", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: String(process.env.token_discordextremelist),
			},
			body: JSON.stringify({ guildCount: client.guilds.cache.size }),
		}).catch((err) => Logger.debug(`Voting site update failed: ${err?.message ?? err}`));
	}
}

function post(url: string, token: string | undefined, body: URLSearchParams): void {
	if (!token) return;
	fetch(url, {
		method: "POST",
		headers: { Authorization: token },
		body,
	}).catch((err) => Logger.debug(`Voting site update failed (${url}): ${err?.message ?? err}`));
}

function startHourlyTasks(): void {
	setInterval(() => {
		setPresence();
		updateVotingSites();
		Logger.verbose("Hourly tasks executed");
	}, 3600000);
}

function shutdown(signal: string): void {
	Logger.info(`Received ${signal}, shutting down`);
	cryptoService.stop();
	fiatService.stop();
	client.destroy();
	db.close();
	process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

client.login(process.env.token);
