import { SlashCommandBuilder } from "discord.js";
import Logger from "../../features/errorhandle/errorhandle.js";

// 初始化 Logger
const logger = new Logger();

export const data = new SlashCommandBuilder()
    .setName('randomchar')
    .setDescription('Randomly returns a user-inputted word') // 隨機返回一個使用者輸入的字
    .addStringOption((option) =>
        option
            .setName('input')
            .setDescription('Input string, separated by spaces') // 輸入的字串，用空白分割
            .setRequired(true)
    );

export async function execute(interaction) {
    const input = interaction.options.getString('input');
    const userTag = interaction.user.tag;
    const guildId = interaction.guild?.id || 'DM'; // 若為 DM，guildId 為 undefined

    try {
        // Log 指令被觸發的資訊
        logger.info(`Command /randomchar triggered by ${userTag} in guild ${guildId} with input: "${input}"`);

        // 將輸入的字串拆分成單字陣列
        const words = input.trim().split(/\s+/);

        // 若未輸入有效的字，回覆提示
        if (words.length === 0) {
            logger.warn(`User ${userTag} in guild ${guildId} provided no valid words.`);
            await interaction.reply('You did not provide any words.'); // 你沒有提供任何字。
            return;
        }

        // 隨機選擇一個單字
        const randomIndex = Math.floor(Math.random() * words.length);
        const randomWord = words[randomIndex];

        // Log 隨機選擇的單字
        logger.info(`Randomly selected word "${randomWord}" for user ${userTag} in guild ${guildId}`);

        // 回覆隨機選擇的單字
        await interaction.reply(randomWord);
    } catch (error) {
        // 錯誤處理
        logger.error(`Error in /randomchar command in guild ${guildId}: ${error.message}`);
        await interaction.reply('❌ An error occurred while processing your request. Please try again later.');
    }
}