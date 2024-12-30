import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('randomchar')
    .setDescription('Randomly returns a user-inputted word') // 隨機返回一個使用者輸入的字
    .addStringOption(option => 
        option.setName('input')
        .setDescription('Input string, separated by spaces') // 輸入的字串，用空白分割
        .setRequired(true))
    
export async function execute(interaction) {
    const input = interaction.options.getString('input');
    const words = input.trim().split(/\s+/);

    if (words.length === 0) {
        return interaction.reply('You did not provide any words.'); // 你沒有提供任何字。
    }

    const randomIndex = Math.floor(Math.random() * words.length);
    const randomWord = words[randomIndex];

    await interaction.reply(randomWord);
    };