import { SlashCommandBuilder } from 'discord.js';
import MusicPlayer from '../../features/music/musicPlayer.js';
import Logger from '../../features/errorhandle/errorhandle.js';

// 初始化 Logger
const logger = new Logger();

// 定義 slash command 的結構
export const data = new SlashCommandBuilder()
    .setName('music_skip')
    .setDescription('Skip to the next song');

// 定義 slash command 執行函數
export async function execute(interaction) {
    try {
        const guildId = interaction.guild.id;
        const userTag = interaction.user.tag;

        logger.info(`Command /music_skip triggered by ${userTag} in guild ${guildId}`);

        // 獲取伺服器專屬播放器
        const player = new MusicPlayer(guildId);
        logger.info(`Retrieved music player for guild ${guildId}`);

        // 獲取播放列表
        const playlist = player.getPlaylist();
        if (playlist.length === 0) {
            logger.warn(`User ${userTag} attempted to skip, but the playlist is empty in guild ${guildId}`);
            return await interaction.reply('❌ The playlist is currently empty, unable to skip to the next song.');
        }

        logger.info(`Playlist length for guild ${guildId}: ${playlist.length}`);

        // 嘗試跳到下一首歌曲
        const skipped = player.handleNextSong(interaction);

        // 回覆跳轉結果
        if (skipped) {
            logger.info(`Successfully skipped to the next song in guild ${guildId} by ${userTag}`);
            await interaction.reply('✅ Skipped to the next song!');
        } else {
            logger.warn(`Failed to skip to the next song in guild ${guildId} by ${userTag}`);
            await interaction.reply('❌ Unable to skip to the next song, please try again later.');
        }
    } catch (error) {
        logger.error(`Error in /music_skip command in guild ${interaction.guild.id}: ${error.message}`);
        await interaction.reply('❌ An error occurred while executing the skip command, please try again later.');
    }
}