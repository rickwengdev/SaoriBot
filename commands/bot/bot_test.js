import { SlashCommandBuilder } from 'discord.js'

// 定義 slash 指令的資料
export const data = new SlashCommandBuilder()
    .setName('bot_test')
    .setDescription('Test the robot running status')

// 定義執行 slash 指令的函數
export async function execute(interaction) {
    // 回覆測試成功的訊息
    await interaction.reply('The robot is running')
}