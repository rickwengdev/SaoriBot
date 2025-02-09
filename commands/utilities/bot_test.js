import { SlashCommandBuilder } from 'discord.js';
import Logger from '../../features/errorhandle/errorhandle.js';

// Initialize Logger instance
const logger = new Logger();

// Define the command name and description
export const data = new SlashCommandBuilder()
    .setName('bot_test')
    .setDescription('Test the bot running status');

export async function execute(interaction) {
    const userTag = interaction.user.tag;
    const guildId = interaction.guild?.id || 'DM'; // Default to 'DM' if used in direct messages

    try {
        // Log command trigger information
        logger.info(`Command /bot_test triggered by ${userTag} in guild ${guildId}`);

        // Reply to the user to confirm the bot is running
        await interaction.reply('The bot is running');

        // Log successful reply
        logger.info(`Successfully replied to /bot_test command in guild ${guildId}`);
    } catch (error) {
        // Log error information
        logger.error(`Error in /bot_test command in guild ${guildId}: ${error.message}`);

        // Reply with an error message
        await interaction.reply('❌ An error occurred while processing the command.');
    }
}