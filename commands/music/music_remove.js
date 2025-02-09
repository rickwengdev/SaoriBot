import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import MusicPlayer from '../../features/music/musicPlayer.js';
import ytdl from '@distube/ytdl-core';
import Logger from '../../features/errorhandle/errorhandle.js';

// Initialize Logger instance
const logger = new Logger();

// Define the structure of the Slash Command
export const data = new SlashCommandBuilder()
    .setName('music_remove')
    .setDescription('Remove a song from the playlist')
    .addStringOption(option =>
        option.setName('url')
            .setDescription('The URL of the song to remove from the playlist')
            .setRequired(true));

// Define the execution function for the Slash Command
export async function execute(interaction) {
    try {
        await interaction.deferReply(); // Defer reply to prevent timeout

        const guildId = interaction.guild.id;
        const userTag = interaction.user.tag;

        logger.info(`Command /music_remove triggered by ${userTag} in guild ${guildId}`);

        // Retrieve the music player instance for the guild
        const player = new MusicPlayer(guildId);

        // Retrieve the specified song URL
        const songUrl = interaction.options.getString('url');

        logger.info(`Attempting to remove song with URL: ${songUrl} from the playlist in guild ${guildId}`);

        // Retrieve the playlist and check if the song exists
        const playlist = player.getPlaylist();
        if (!playlist.includes(songUrl)) {
            logger.warn(`Song URL (${songUrl}) not found in the playlist for guild ${guildId}`);
            return interaction.editReply(`❌ The song URL (${songUrl}) is not in the playlist.`);
        }

        // Remove the specified song from the playlist
        player.removeSong(songUrl);
        logger.info(`Successfully removed song URL (${songUrl}) from the playlist in guild ${guildId}`);

        // Retrieve song details
        let videoDetails;
        try {
            const info = await ytdl.getBasicInfo(songUrl);
            videoDetails = info?.videoDetails;
            logger.info(`Fetched video details for URL (${songUrl}): Title - ${videoDetails?.title}`);
        } catch (error) {
            logger.warn(`Unable to fetch song details for URL (${songUrl}): ${error.message}`);
        }

        // Respond with a success message
        if (videoDetails) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000') // YouTube red
                .setTitle(videoDetails.title)
                .setThumbnail(videoDetails.thumbnails[0]?.url || '')
                .setDescription('🎵 This song has been successfully removed from the playlist.');
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.editReply(`🎵 The song has been successfully removed from the playlist: ${songUrl}`);
        }
    } catch (error) {
        logger.error(`Error in /music_remove command in guild ${interaction.guild.id}: ${error.message}`);
        await interaction.editReply('❌ Unable to remove the song, please try again later.');
    }
}