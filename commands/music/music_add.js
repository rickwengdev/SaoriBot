import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import MusicPlayer from '../../features/music/musicPlayer.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import ytdl from '@distube/ytdl-core';
import Logger from '../../features/errorhandle/errorhandle.js';

// Initialize Logger instance
const logger = new Logger();

/**
 * Validate whether a given URL is a valid YouTube link
 * @param {string} url - URL to be validated
 * @returns {Promise<boolean>} - Whether the URL is a valid YouTube link
 */
async function isValidYoutubeUrl(url) {
    try {
        const info = await ytdl.getBasicInfo(url);
        const isPlayable = info?.videoDetails?.isPlayable;

        logger.info(`URL validation for "${url}": ${isPlayable ? 'Playable' : 'Unplayable/Restricted'}`);
        return isPlayable;
    } catch (error) {
        logger.error(`Error validating YouTube URL: ${url}`, error);
        return false;
    }
}

/**
 * Retrieve basic information of a YouTube video
 * @param {string} url - YouTube video URL
 * @returns {Promise<Object>} - Basic video details
 */
async function getVideoInfo(url) {
    try {
        const info = await ytdl.getBasicInfo(url);
        if (!info || !info.videoDetails) {
            throw new Error('Failed to retrieve video information.');
        }
        logger.info(`Fetched video info for "${url}": Title: ${info.videoDetails.title}`);
        return info.videoDetails;
    } catch (error) {
        logger.error(`Error fetching video info for URL: ${url}`, error);
        throw error;
    }
}

/**
 * Add a song to the playlist
 * @param {import('discord.js').CommandInteraction} interaction - Discord command interaction object
 */
async function addToPlaylist(interaction) {
    try {
        await interaction.deferReply();

        const songUrl = interaction.options.getString('url');
        const guildId = interaction.guild.id;

        logger.info(`Command /music_add triggered by ${interaction.user.tag} in guild ${guildId} with URL: ${songUrl}`);

        // Validate URL
        if (!await isValidYoutubeUrl(songUrl)) {
            logger.warn(`Invalid YouTube URL provided by ${interaction.user.tag}: ${songUrl}`);
            await interaction.editReply(`The provided URL "${songUrl}" is not a valid YouTube video.`);
            return;
        }

        // Get the guild-specific music player and add the song
        const player = new MusicPlayer(guildId);
        player.addSong(songUrl);
        logger.info(`Added song to playlist for guild ${guildId}: ${songUrl}`);

        // Retrieve video details
        const videoDetails = await getVideoInfo(songUrl);
        const rawDescription = videoDetails?.description;
        const saveDescription = typeof rawDescription === 'string' ? rawDescription.slice(0, 200) + '...' : 'No description available.';

        // Construct an embed message
        const embed = new EmbedBuilder()
            .setColor('#FF0000') // YouTube red
            .setTitle(videoDetails.title)
            .setURL(songUrl)
            .setThumbnail(videoDetails.thumbnails[0]?.url || '') // Handle empty thumbnails
            .setDescription(saveDescription); // Limit description length

        logger.info(`Successfully created embed for video: ${videoDetails.title}`);

        await interaction.editReply({ content: '✅ Song added to the playlist!', embeds: [embed] });
    } catch (error) {
        logger.error(`Error adding song to playlist in guild ${interaction.guild?.id || 'DM'}:`, error);
        await interaction.editReply('❌ An error occurred while adding the song to the playlist.');
    }
}

// Define the Slash Command
export const data = new SlashCommandBuilder()
    .setName('music_add')
    .setDescription('Add a song to a playlist')
    .addStringOption(option =>
        option.setName('url')
            .setDescription('The URL of the song to add to the playlist')
            .setRequired(true));

// Define the Slash Command execution function
export async function execute(interaction) {
    await addToPlaylist(interaction);
}
