import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import MusicPlayer from '../../features/music/musicPlayer.js';
import ytdl from '@distube/ytdl-core';
import Logger from '../../features/errorhandle/errorhandle.js';

// 初始化 Logger
const logger = new Logger();

/**
 * 顯示當前播放列表
 * @param {import('discord.js').CommandInteraction} interaction - Discord 指令交互对象
 */
async function viewPlaylist(interaction) {
    try {
        const guildId = interaction.guild.id;
        const userTag = interaction.user.tag;

        logger.info(`Command /music_showplaylist triggered by ${userTag} in guild ${guildId}`);

        const player = new MusicPlayer(guildId);
        const playlist = player.getPlaylist();

        // 檢查播放列表是否為空
        if (playlist.length === 0) {
            logger.info(`Playlist is empty for guild ${guildId}`);
            return interaction.reply('🎵 The playlist is currently empty!');
        }

        // 創建嵌入並設置標題和描述
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🎶 Current Playlist')
            .setDescription('Here are the songs in the current playlist:');

        // 限制字段數量，以避免 Discord 限制
        const fields = [];

        // 遍歷播放列表，獲取歌曲信息
        for (const [index, songUrl] of playlist.entries()) {
            try {
                const info = await ytdl.getBasicInfo(songUrl);
                const title = info.videoDetails.title;

                logger.info(`Fetched info for song ${index + 1}: ${title}`);

                // 添加歌曲信息到字段
                fields.push({
                    name: `${index + 1}. ${title}`, // 歌曲標題
                    value: `[Click to open](${songUrl})`, // 歌曲 URL
                    inline: false
                });

                // 如果是第一首歌曲，設置縮略圖
                if (index === 0) {
                    embed.setThumbnail(info.videoDetails.thumbnails[0]?.url || '');
                }

                // 限制顯示的歌曲數量
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

        // 添加字段到嵌入消息
        embed.addFields(fields);

        // 回覆播放列表
        logger.info(`Successfully generated playlist embed for guild ${guildId}`);
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error(`Error in viewPlaylist for guild ${interaction.guild.id}: ${error.message}`);
        await interaction.reply('❌ Unable to display the playlist, please try again later.');
    }
}

// 定義 Slash Command 的結構
export const data = new SlashCommandBuilder()
    .setName('music_showplaylist')
    .setDescription('Show the current playlist');

// 定義 Slash Command 執行函數
export async function execute(interaction) {
    // 顯示當前播放列表
    await viewPlaylist(interaction);
}