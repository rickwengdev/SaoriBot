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

dotenv.config();

// 初始化 Logger
const logger = new Logger();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessages,
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

client.once(Events.ClientReady, c => {
    logger.info(`✅Ready! Signed in as ${c.user.tag}`);

    // 設置機器人狀態
    client.user.setPresence({ activities: [{ name: 'DISCORD.JS' }], status: 'dnd' });

    // 調用 setup() 函數以設定所有功能
    setup();
});

export function setup() {
    // 設置訊息反應事件
    new MessageReactionHandler(client, process.env.apiEndpoint);

    // 設置用戶加入伺服器事件
    new GuildMembers(client, process.env.apiEndpoint);

    // 設置自動語音頻道功能
    new DynamicVoiceChannelManager(client, process.env.apiEndpoint);

    // 設置日誌功能
    new LoggingManager(client, process.env.apiEndpoint);

    // 日誌記錄功能啟動
    logger.info('Logger setup completed.');
}

// 捕獲未處理的異常和拒絕的 Promise
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 登錄到 Discord
client.login(process.env.token).catch(error => {
    logger.error('Failed to login:', error);
});