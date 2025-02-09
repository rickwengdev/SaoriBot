import { SlashCommandBuilder } from 'discord.js';
import MusicPlayer from '../../features/music/musicPlayer.js';
import Logger from '../../features/errorhandle/errorhandle.js';

// Initialize Logger instance
const logger = new Logger();

// Define Slash Command
export const data = new SlashCommandBuilder()
    .setName('music_play')
    .setDescription('Play the first song in the playlist');

// Define Slash Command execution function
export async function execute(interaction) {
    try {
        await interaction.deferReply(); // Defer reply to prevent timeout

        const guildId = interaction.guild.id;
        const userTag = interaction.user.tag;

        logger.info(`Command /music_play triggered by ${userTag} in guild ${guildId}`);

        // Check if user is in a voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            logger.warn(`User ${userTag} tried to play music without joining a voice channel.`);
            return interaction.editReply('❌ Please join a voice channel first.');
        }

        // Retrieve the guild-specific music player
        const player = new MusicPlayer(guildId);
        logger.info(`Retrieved music player for guild ${guildId}`);

        // Attempt to play a song
        const playlist = player.getPlaylist();
        if (playlist.length === 0) {
            logger.warn(`User ${userTag} attempted to play music, but the playlist is empty.`);
            return interaction.editReply('🎵 The playlist is currently empty. Please add some songs first!');
        }

        logger.info(`Playing song "${playlist[0].title}" in guild ${guildId} for user ${userTag}`);
        await player.playSong(interaction); // Play the first song
        logger.info(`Successfully started playing "${playlist[0].title}" in guild ${guildId}`);
    } catch (error) {
        logger.error(`Error in /music_play command in guild ${interaction.guild.id}: ${error.message}`);
        await interaction.editReply('❌ Unable to play the song. Please try again later.');
    }
}