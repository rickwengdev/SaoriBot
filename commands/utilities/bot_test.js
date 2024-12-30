import { SlashCommandBuilder } from 'discord.js'

// 設定指令名稱及描述
export const data = new SlashCommandBuilder()
    .setName('bot_test')
    .setDescription('Test the robot running status')

// 執行指令時回應使用者
export async function execute(interaction) {
    await interaction.reply('The robot is running')
}