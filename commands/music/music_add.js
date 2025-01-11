import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import MusicPlayer from '../../features/music/musicPlayer.js';
import axios from 'axios';
import cheerio from 'cheerio';
import ytdl from '@distube/ytdl-core';
import Logger from '../../features/errorhandle/errorhandle.js';

// 初始化 Logger
const logger = new Logger();

/**
 * 檢查是否為有效的 YouTube 鏈接
 * @param {string} url - 待檢查的 URL
 * @returns {Promise<boolean>} - 是否為有效的 YouTube 鏈接
 */
async function isValidYoutubeUrl(url) {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const isValid = $('title').text() !== 'YouTube';
        logger.info(`URL validation for "${url}": ${isValid ? 'Valid' : 'Invalid'}`);
        return isValid;
    } catch (error) {
        logger.error(`Error validating YouTube URL: ${url}`, error);
        return false;
    }
}

/**
 * 獲取 YouTube 視頻的基本信息
 * @param {string} url - YouTube 視頻 URL
 * @returns {Promise<Object>} - 視頻基本信息
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
 * 添加歌曲到播放列表
 * @param {import('discord.js').CommandInteraction} interaction - Discord 指令交互對象
 */
async function addToPlaylist(interaction) {
    try {
        await interaction.deferReply();

        const songUrl = interaction.options.getString('url');
        const guildId = interaction.guild.id;

        logger.info(`Command /music_add triggered by ${interaction.user.tag} in guild ${guildId} with URL: ${songUrl}`);

        // 驗證 URL 是否有效
        if (!await isValidYoutubeUrl(songUrl)) {
            logger.warn(`Invalid YouTube URL provided by ${interaction.user.tag}: ${songUrl}`);
            await interaction.editReply(`The provided URL "${songUrl}" is not a valid YouTube video.`);
            return;
        }

        // 獲取伺服器專屬播放器並添加歌曲
        const player = new MusicPlayer(guildId);
        player.addSong(songUrl);
        logger.info(`Added song to playlist for guild ${guildId}: ${songUrl}`);

        // 獲取視頻詳細信息
        const videoDetails = await getVideoInfo(songUrl);

        // 構建嵌入消息
        const embed = new EmbedBuilder()
            .setColor('#FF0000') // YouTube 紅色
            .setTitle(videoDetails.title)
            .setURL(songUrl)
            .setThumbnail(videoDetails.thumbnails[0]?.url || '') // 防止縮略圖為空
            .setDescription(videoDetails.description.slice(0, 200) + '...'); // 限制描述長度

        logger.info(`Successfully created embed for video: ${videoDetails.title}`);

        await interaction.editReply({ content: '✅ Song added to the playlist!', embeds: [embed] });
    } catch (error) {
        logger.error(`Error adding song to playlist in guild ${interaction.guild?.id || 'DM'}:`, error);
        await interaction.editReply('❌ An error occurred while adding the song to the playlist.');
    }
}

// 定義 Slash Command
export const data = new SlashCommandBuilder()
    .setName('music_add')
    .setDescription('Add a song to a playlist')
    .addStringOption(option =>
        option.setName('url')
            .setDescription('The URL of the song to add to the playlist')
            .setRequired(true));

// 定義 Slash Command 執行函數
export async function execute(interaction) {
    await addToPlaylist(interaction);
}