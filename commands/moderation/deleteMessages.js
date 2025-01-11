import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import MessageDeleter from "../../features/moderation/messageDelete.js";
import Logger from "../../features/errorhandle/errorhandle.js";

// 初始化 Logger
const logger = new Logger();

export const data = new SlashCommandBuilder()
    .setName('mod_delete_message')
    .setDescription('Delete message')
    .addIntegerOption(option =>
        option.setName('message_number')
            .setDescription('Number of messages to delete')
            .setRequired(true))
    .addBooleanOption(option =>
        option.setName('reliable_vintage_model')
            .setDescription('Is it the deletion mode for messages older than two weeks or more than 100 messages?'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const messageNumber = interaction.options.getInteger('message_number');
    let timeRangeBig = interaction.options.getBoolean('reliable_vintage_model');

    if (timeRangeBig === null) timeRangeBig = true;

    // 記錄命令被執行的信息
    logger.info(`Command /mod_delete_message executed by ${interaction.user.tag} in ${interaction.guild?.name || 'DM'} with options: 
    message_number=${messageNumber}, reliable_vintage_model=${timeRangeBig}`);

    try {
        // 初始化 MessageDeleter 類並執行刪除邏輯
        const deleter = new MessageDeleter(interaction);

        // 記錄即將執行的刪除操作
        logger.info(`Starting message deletion. Message number: ${messageNumber}, Reliable Vintage Mode: ${timeRangeBig}`);

        await deleter.handleInteraction(messageNumber, timeRangeBig);

        // 記錄成功刪除
        logger.info(`Successfully deleted ${messageNumber} messages. Mode: ${timeRangeBig ? 'Reliable Vintage' : 'Normal'}`);
        await interaction.reply({
            content: `${messageNumber} messages deleted successfully.`,
            ephemeral: true,
        });
    } catch (error) {
        // 記錄錯誤信息
        logger.error(`Error executing /mod_delete_message command by ${interaction.user.tag}:`, error);

        await interaction.reply({
            content: "An error occurred while deleting messages.",
            ephemeral: true,
        });
    }
}