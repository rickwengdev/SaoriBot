import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import MusicPlayer from '../../features/music/musicPlayer.js';
import axios from 'axios';
import cheerio from 'cheerio';
import ytdl from '@distube/ytdl-core';

/**
 * 檢查是否為有效的 YouTube 鏈接
 * @param {string} url - 待檢查的 URL
 * @returns {Promise<boolean>} - 是否為有效的 YouTube 鏈接
 */
async function isValidYoutubeUrl(url) {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        return $('title').text() !== 'YouTube'; // 如果標題不是 "YouTube"，則認為是有效鏈接
    } catch (error) {
        console.error(`Error validating YouTube URL: ${error.message}`);
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
        return info.videoDetails;
    } catch (error) {
        console.error(`Error fetching video info: ${error.message}`);
        throw error;
    }
}

/**
 * 添加歌曲到播放列表
 * @param {import('discord.js').CommandInteraction} interaction - Discord 指令交互對象
 */
async function addToPlaylist(interaction) {
    try {
        await interaction.deferReply(); // 確保交互回覆被延遲處理

        const songUrl = interaction.options.getString('url');
        const guildId = interaction.guild.id;

        // 驗證 URL 是否有效
        if (!await isValidYoutubeUrl(songUrl)) {
            await interaction.editReply(`The provided URL "${songUrl}" is not a valid YouTube video.`);
            return;
        }

        // 獲取伺服器專屬播放器並添加歌曲
        const player = new MusicPlayer(guildId); // 動態生成播放器以支援多伺服器
        player.addSong(songUrl);

        // 獲取視頻詳細信息
        const videoDetails = await getVideoInfo(songUrl);

        // 構建嵌入消息
        const embed = new EmbedBuilder()
            .setColor('#FF0000') // YouTube 紅色
            .setTitle(videoDetails.title)
            .setURL(songUrl)
            .setThumbnail(videoDetails.thumbnails[0]?.url || '') // 防止縮略圖為空
            .setDescription(videoDetails.description.slice(0, 200) + '...'); // 限制描述長度

        await interaction.editReply({ content: '✅ Song added to the playlist!', embeds: [embed] });
    } catch (error) {
        console.error(`Error adding song to playlist: ${error.message}`);
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