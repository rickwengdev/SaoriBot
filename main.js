import { readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'node:url';
import path, { dirname } from 'node:path';
import { Client, Partials, Events, Collection, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import MessageReactionHandler from './features/moderation/messageReaction.js';
import DynamicVoiceChannelManager from './features/moderation/dynamicVoiceChannel.js';
import LoggingManager from './features/moderation/logservermessage.js';
import GuildMembers from './features/welcome/guildMember.js';
import Logger from './features/errorhandle/errorhandle.js';
import trackingMembersNumber from './features/moderation/trackingMembersNumber.js';
import * as messageEventHandler from './features/eventhandle/messageCreate.js';

dotenv.config();

// Initialize Logger
const logger = new Logger();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const foldersPath = path.join(__dirname, 'commands');

const commandFolders = readdirSync(foldersPath).filter(folder => {
    const folderPath = path.join(foldersPath, folder);
    return statSync(folderPath).isDirectory();
});

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js') && statSync(path.join(commandsPath, file)).isFile());

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        import(filePath)
            .then(command => {
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    logger.info(`Command loaded: ${command.data.name}`);
                } else {
                    logger.warn(`[WARNING] The command in ${filePath} is missing a required "data" or "execute" attribute.`);
                }
            })
            .catch(error => {
                logger.error(`[ERROR] Failed to load command ${filePath}:`, error);
            });
    }
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        logger.error(`No command matching ${interaction.commandName} found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        if (error.code !== 'InteractionAlreadyReplied') {
            logger.error('An error occurred while executing the command:', error);
        }
        await interaction.reply({ content: 'An error occurred while executing this command!', ephemeral: true });
    }
});

client.on(messageEventHandler.name, messageEventHandler.execute);

client.once(Events.ClientReady, c => {
    logger.info(`✅ Ready! Signed in as ${c.user.tag}`);

    // Set bot presence
    client.user.setPresence({ activities: [{ name: 'DISCORD.JS' }], status: 'dnd' });

    // Call setup() to initialize all features
    setup();
});

export function setup() {
    // Setup reaction event handling
    new MessageReactionHandler(client, process.env.apiEndpoint);

    // Setup user join event handling
    new GuildMembers(client, process.env.apiEndpoint);

    // Setup dynamic voice channel management
    new DynamicVoiceChannelManager(client, process.env.apiEndpoint);

    // Setup server member tracking
    new trackingMembersNumber(client, process.env.apiEndpoint);

    // Setup logging management
    new LoggingManager(client, process.env.apiEndpoint);

    // Log setup completion
    logger.info('Logger setup completed.');
}

// Capture unhandled exceptions and rejected promises
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Increase the maximum number of listeners for the process
process.setMaxListeners(20);

// Login to Discord
client.login(process.env.TOKEN).catch(error => {
    console.error('Failed to login:', error);
});