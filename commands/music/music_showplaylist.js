import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import MusicPlayer from '../../features/music/musicPlayer.js';
import ytdl from '@distube/ytdl-core';
import Logger from '../../features/errorhandle/errorhandle.js';

// Initialize Logger instance
const logger = new Logger();

/**
 * Display the current playlist
 * @param {import('discord.js').CommandInteraction} interaction - Discord command interaction object
 */
async function viewPlaylist(interaction) {
    try {
        const guildId = interaction.guild.id;
        const userTag = interaction.user.tag;

        logger.info(`Command /music_showplaylist triggered by ${userTag} in guild ${guildId}`);

        const player = new MusicPlayer(guildId);
        const playlist = player.getPlaylist();

        // Check if the playlist is empty
        if (playlist.length === 0) {
            logger.info(`Playlist is empty for guild ${guildId}`);
            return interaction.reply('🎵 The playlist is currently empty!');
        }

        // Create an embed message
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🎶 Current Playlist')
            .setDescription('Here are the songs in the current playlist:');

        // Limit the number of fields to avoid Discord restrictions
        const fields = [];

        // Iterate through the playlist to get song details
        for (const [index, songUrl] of playlist.entries()) {
            try {
                const info = await ytdl.getBasicInfo(songUrl);
                const title = info.videoDetails.title;

                logger.info(`Fetched info for song ${index + 1}: ${title}`);

                // Add song details to the fields
                fields.push({
                    name: `${index + 1}. ${title}`, // Song title
                    value: `[Click to open](${songUrl})`, // Song URL
                    inline: false
                });

                // Set a thumbnail for the first song
                if (index === 0) {
                    embed.setThumbnail(info.videoDetails.thumbnails[0]?.url || '');
                }

                // Limit the displayed songs to avoid excessive list size
                if (fields.length >= 25) {
                    fields.push({
                        name: '⚠️ More songs...',
                        value: 'The playlist is too long, only the first 25 songs are displayed.',
                        inline: false
                    });
                    logger.warn(`Playlist for guild ${guildId} exceeds 25 songs. Display truncated.`);
                    break;
                }
            } catch (error) {
                logger.error(`Error fetching song info for URL: ${songUrl}`, error);
                fields.push({
                    name: '⚠️ Error',
                    value: 'Unable to fetch song information.',
                    inline: false
                });
            }
        }

        // Add fields to the embed message
        embed.addFields(fields);

        // Reply with the playlist embed
        logger.info(`Successfully generated playlist embed for guild ${guildId}`);
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error(`Error in viewPlaylist for guild ${interaction.guild.id}: ${error.message}`);
        await interaction.reply('❌ Unable to display the playlist, please try again later.');
    }
}

// Define the Slash Command structure
export const data = new SlashCommandBuilder()
    .setName('music_showplaylist')
    .setDescription('Show the current playlist');

// Define the Slash Command execution function
export async function execute(interaction) {
    // Display the current playlist
    await viewPlaylist(interaction);
}
