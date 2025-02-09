import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import ytdl from '@distube/ytdl-core';
import path from 'path';
import Logger from '../../features/errorhandle/errorhandle.js';

// Initialize Logger instance
const logger = new Logger();

const downloadPath = path.resolve('./downloads');

/**
 * Initialize the download directory
 */
async function initializeDownloadPath() {
    try {
        await fs.access(downloadPath);
        logger.info(`Download path exists: ${downloadPath}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(downloadPath);
            logger.info(`Created download path: ${downloadPath}`);
        } else {
            logger.error(`Error initializing download path: ${error.message}`);
            throw error;
        }
    }
}

/**
 * Download YouTube audio as MP3
 * @param {string} url - YouTube video URL
 * @param {string} filename - Filename to save
 * @returns {Promise<string>} - Path of the downloaded file
 */
async function downloadMp3(url, filename) {
    const filePath = path.join(downloadPath, filename);

    logger.info(`Starting download for URL: ${url}`);
    return new Promise((resolve, reject) => {
        const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });

        audioStream.pipe(createWriteStream(filePath))
            .on('finish', () => {
                logger.info(`Downloaded MP3 file: ${filePath}`);
                resolve(filePath);
            })
            .on('error', (error) => {
                logger.error(`Error during MP3 download: ${error.message}`);
                reject(error);
            });
    });
}

/**
 * Handle downloading and uploading MP3 file
 * @param {import('discord.js').CommandInteraction} interaction - Discord command interaction object
 */
async function downloadAndUploadVideo(interaction) {
    try {
        await interaction.deferReply(); // Defer reply to allow processing time

        const videoUrl = interaction.options.getString('url');
        logger.info(`Command /download_video triggered by ${interaction.user.tag} with URL: ${videoUrl}`);

        const info = await ytdl.getBasicInfo(videoUrl);
        if (!info || !info.videoDetails) {
            logger.warn(`Unable to retrieve video info for URL: ${videoUrl}`);
            return interaction.editReply(`Unable to retrieve video information: ${videoUrl}`);
        }

        const videoTitle = info.videoDetails.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const mp3Filename = `${videoTitle}.mp3`;

        // Download MP3 file
        const mp3Path = await downloadMp3(videoUrl, mp3Filename);

        // Check file size
        const stats = await fs.stat(mp3Path);
        const fileSizeInMB = stats.size / (1024 * 1024);
        if (fileSizeInMB > 8) { // Discord upload limit is 8MB
            logger.warn(`File too large (${fileSizeInMB.toFixed(2)} MB), deleting: ${mp3Path}`);
            await fs.unlink(mp3Path);
            return interaction.editReply(`File too large (${fileSizeInMB.toFixed(2)} MB), exceeds Discord upload limit.`);
        }

        // Create embed message
        const embed = new EmbedBuilder()
            .setColor('#FF0000') // YouTube red
            .setTitle(info.videoDetails.title)
            .setURL(info.videoDetails.video_url)
            .setDescription(`**Author**: ${info.videoDetails.author.name}\n**Duration**: ${formatDuration(info.videoDetails.lengthSeconds)}`)
            .setThumbnail(info.videoDetails.thumbnails[0].url)
            .setFooter({ text: 'Thank you for using our music bot!' });

        // Send embed message and upload file
        await interaction.editReply({
            embeds: [embed],
            files: [mp3Path],
        });

        logger.info(`Successfully uploaded MP3 for video: ${info.videoDetails.title}`);

        // Clean up downloaded file
        await fs.unlink(mp3Path);
        logger.info(`Deleted temporary file: ${mp3Path}`);
    } catch (error) {
        logger.error(`Error in downloadAndUploadVideo: ${error.message}`);
        await interaction.editReply('❌ An error occurred while downloading or uploading the video, please try again later.');
    }
}

/**
 * Helper function: Format duration
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted duration
 */
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes} min ${secs} sec`;
}

// Define Slash Command
export const data = new SlashCommandBuilder()
    .setName('download_video')
    .setDescription('Download MP3 audio from a YouTube video')
    .addStringOption(option =>
        option.setName('url')
            .setDescription('URL of the YouTube video')
            .setRequired(true));

// Execute Slash Command
export async function execute(interaction) {
    await initializeDownloadPath(); // Ensure download directory exists
    await downloadAndUploadVideo(interaction);
}