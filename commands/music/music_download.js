import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import ytdl from '@distube/ytdl-core';
import path from 'path';

const downloadPath = path.resolve('./downloads');

/**
 * 初始化下載目錄
 */
async function initializeDownloadPath() {
    try {
        await fs.access(downloadPath);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(downloadPath);
        } else {
            throw error;
        }
    }
}

/**
 * 下載 YouTube 音頻為 MP3
 * @param {string} url - YouTube 視頻 URL
 * @param {string} filename - 保存的文件名
 * @returns {Promise<string>} - 文件路徑
 */
async function downloadMp3(url, filename) {
    const filePath = path.join(downloadPath, filename);

    return new Promise((resolve, reject) => {
        const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });

        audioStream.pipe(createWriteStream(filePath))
            .on('finish', () => resolve(filePath))
            .on('error', reject);
    });
}

/**
 * 處理下載並上傳 MP3 文件
 * @param {import('discord.js').CommandInteraction} interaction - Discord 指令交互對象
 */
async function downloadAndUploadVideo(interaction) {
    try {
        await interaction.deferReply(); // 延遲回覆以處理時間

        const videoUrl = interaction.options.getString('url');
        const info = await ytdl.getBasicInfo(videoUrl);

        if (!info || !info.videoDetails) {
            return interaction.editReply(`Unable to retrieve video information: ${videoUrl}`);
        }

        const videoTitle = info.videoDetails.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const mp3Filename = `${videoTitle}.mp3`;

        // 下載 MP3 文件
        const mp3Path = await downloadMp3(videoUrl, mp3Filename);

        // 檢查文件大小
        const stats = await fs.stat(mp3Path);
        const fileSizeInMB = stats.size / (1024 * 1024);
        if (fileSizeInMB > 8) {  // 8MB 的 Discord 上傳限制
            await fs.unlink(mp3Path); // 刪除文件
            return interaction.editReply(`File too large (${fileSizeInMB.toFixed(2)} MB), exceeds Discord upload limit.`);
        }

        // 創建嵌入消息
        const embed = new EmbedBuilder()
            .setColor('#FF0000') // YouTube 紅色
            .setTitle(info.videoDetails.title)
            .setURL(info.videoDetails.video_url)
            .setDescription(`**Author**: ${info.videoDetails.author.name}\n**Duration**: ${formatDuration(info.videoDetails.lengthSeconds)}`)
            .setThumbnail(info.videoDetails.thumbnails[0].url)
            .setFooter({ text: 'Thank you for using our music bot!' });

        // 下載完成，發送嵌入消息並上傳文件
        await interaction.editReply({
            embeds: [embed],
            files: [mp3Path]
        });

        // 清理下載的文件
        await fs.unlink(mp3Path);
    } catch (error) {
        console.error(`Error in downloadAndUploadVideo: ${error.message}`);
        await interaction.editReply('❌ An error occurred while downloading or uploading the video, please try again later.');
    }
}

/**
 * 幫助函數：格式化時長
 * @param {number} seconds - 時間（秒）
 * @returns {string} - 格式化的時間
 */
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes} min ${secs} sec`;
}

// 初始化 Slash Command
export const data = new SlashCommandBuilder()
    .setName('download_video')
    .setDescription('Download MP3 audio from a YouTube video')
    .addStringOption(option =>
        option.setName('url')
            .setDescription('URL of the YouTube video')
            .setRequired(true));

// Slash Command 的執行函數
export async function execute(interaction) {
    await initializeDownloadPath(); // 確保下載目錄存在
    await downloadAndUploadVideo(interaction);
}