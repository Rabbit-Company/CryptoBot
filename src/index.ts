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
import {
	BotList,
	DiscordBotListCom,
	DiscordExtremeListXyz,
	DiscordsCom,
	DisqInk,
	DlistSpace,
	RadarcordNet,
	StatsPoster,
	TopGG,
} from "@rabbit-company/discord-bot-list-sync";

const db = openDatabase("./data/cryptobot.db");
const whitelistService = new WhitelistService(db);
const userService = new UserService(db);
const fiatService = new FiatService(30);
const cryptoService = new CryptoService(30);
const conversionService = new ConversionService(cryptoService, fiatService);

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

function getBotList(): BotList[] {
	const list: BotList[] = [];

	if (process.env.token_topgg) list.push(new TopGG({ token: process.env.token_topgg }));
	if (process.env.token_discords) list.push(new DiscordsCom({ token: process.env.token_discords }));
	if (process.env.token_discordbotlist) list.push(new DiscordBotListCom({ token: process.env.token_discordbotlist }));
	if (process.env.token_discordextremelist) list.push(new DiscordExtremeListXyz({ token: process.env.token_discordextremelist }));
	if (process.env.token_radarcord) list.push(new RadarcordNet({ token: process.env.token_radarcord }));
	if (process.env.token_disqink) list.push(new DisqInk({ token: process.env.token_disqink }));
	if (process.env.token_dlistspace) list.push(new DlistSpace({ token: process.env.token_dlistspace }));

	return list;
}

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

	const botList = getBotList();
	if (botList.length) {
		const poster = new StatsPoster({
			botId: client.user?.id,
			interval: 10 * 60 * 1000, // 10 min
			getStats: () => ({
				guildCount: client.guilds.cache.size,
				userCount: client.guilds.cache.reduce((acc, g) => acc + (g.memberCount ?? 0), 0),
				shardCount: client.shard?.count ?? 1,
			}),
			lists: botList,
			onPost(list, stats) {
				Logger.debug(`[stats] posted ${stats.guildCount} guilds to ${list.name}`);
			},
			onError(list, error) {
				Logger.error(`[stats] failed to post to ${list.name}:`, { error });
			},
		});

		poster.start();
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

function startHourlyTasks(): void {
	setInterval(() => {
		setPresence();
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
