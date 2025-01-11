import { SlashCommandBuilder } from 'discord.js';
import Logger from '../../features/errorhandle/errorhandle.js';

// 初始化 Logger
const logger = new Logger();

// 定義指令名稱及描述
export const data = new SlashCommandBuilder()
    .setName('bot_test')
    .setDescription('Test the robot running status');

export async function execute(interaction) {
    const userTag = interaction.user.tag;
    const guildId = interaction.guild?.id || 'DM'; // 若為 DM，guildId 預設為 'DM'

    try {
        // Log 指令觸發的資訊
        logger.info(`Command /bot_test triggered by ${userTag} in guild ${guildId}`);

        // 回覆用戶確認機器人正在運行
        await interaction.reply('The robot is running');

        // Log 回覆成功
        logger.info(`Successfully replied to /bot_test command in guild ${guildId}`);
    } catch (error) {
        // Log 錯誤信息
        logger.error(`Error in /bot_test command in guild ${guildId}: ${error.message}`);

        // 回覆錯誤信息給用戶
        await interaction.reply('❌ An error occurred while processing the command.');
    }
}