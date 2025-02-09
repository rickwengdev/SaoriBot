import { SlashCommandBuilder } from 'discord.js';
import MusicPlayer from '../../features/music/musicPlayer.js';
import Logger from '../../features/errorhandle/errorhandle.js';

// Initialize Logger instance
const logger = new Logger();

// Define the structure of the Slash Command
export const data = new SlashCommandBuilder()
    .setName('music_stop')
    .setDescription('Stop playing the current song');

// Define the execution function for the Slash Command
export async function execute(interaction) {
    try {
        // Defer reply to prevent timeout
        await interaction.deferReply();

        const guildId = interaction.guild.id;
        const userTag = interaction.user.tag;

        logger.info(`Command /music_stop triggered by ${userTag} in guild ${guildId}`);

        // Retrieve the guild-specific music player
        const player = new MusicPlayer(guildId);
        logger.info(`Retrieved music player for guild ${guildId}`);

        // Retrieve the playlist
        const playlist = player.getPlaylist();
        if (playlist.length === 0) {
            logger.warn(`User ${userTag} attempted to stop playback, but the playlist is empty in guild ${guildId}`);
            return await interaction.editReply('❌ No songs are currently playing, the playlist is empty.');
        }

        logger.info(`Stopping playback in guild ${guildId}, triggered by ${userTag}`);

        // Stop playback
        player.stop(interaction);

        logger.info(`Playback stopped and playlist cleared in guild ${guildId} by ${userTag}`);

        // Reply with stop confirmation message
        await interaction.editReply('✅ Playback has been stopped, the playlist has been cleared.');
    } catch (error) {
        logger.error(`Error in /music_stop command in guild ${interaction.guild.id}: ${error.message}`);
        // Reply with error message
        await interaction.editReply('❌ An error occurred while stopping playback, please try again later.');
    }
}
