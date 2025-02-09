import { SlashCommandBuilder } from "discord.js";
import Logger from "../../features/errorhandle/errorhandle.js";

// Initialize Logger instance
const logger = new Logger();

export const data = new SlashCommandBuilder()
    .setName('randomchar')
    .setDescription('Randomly returns a user-inputted word') // Randomly selects a word from user input
    .addStringOption((option) =>
        option
            .setName('input')
            .setDescription('Input string, separated by spaces') // Input string, words separated by spaces
            .setRequired(true)
    );

export async function execute(interaction) {
    const input = interaction.options.getString('input');
    const userTag = interaction.user.tag;
    const guildId = interaction.guild?.id || 'DM'; // If DM, guildId is undefined

    try {
        // Log command trigger information
        logger.info(`Command /randomchar triggered by ${userTag} in guild ${guildId} with input: "${input}"`);

        // Split the input string into an array of words
        const words = input.trim().split(/\s+/);

        // If no valid words are provided, send a response
        if (words.length === 0) {
            logger.warn(`User ${userTag} in guild ${guildId} provided no valid words.`);
            await interaction.reply('You did not provide any words.');
            return;
        }

        // Randomly select a word
        const randomIndex = Math.floor(Math.random() * words.length);
        const randomWord = words[randomIndex];

        // Log the randomly selected word
        logger.info(`Randomly selected word "${randomWord}" for user ${userTag} in guild ${guildId}`);

        // Reply with the randomly selected word
        await interaction.reply(randomWord);
    } catch (error) {
        // Error handling
        logger.error(`Error in /randomchar command in guild ${guildId}: ${error.message}`);
        await interaction.reply('❌ An error occurred while processing your request. Please try again later.');
    }
}
