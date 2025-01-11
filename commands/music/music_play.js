import { SlashCommandBuilder } from 'discord.js';
import MusicPlayer from '../../features/music/musicPlayer.js';
import Logger from '../../features/errorhandle/errorhandle.js';

// 初始化 Logger
const logger = new Logger();

// 定義 Slash Command
export const data = new SlashCommandBuilder()
    .setName('music_play')
    .setDescription('Play the first song in the playlist');

// 定義 Slash Command 執行函數
export async function execute(interaction) {
    try {
        await interaction.deferReply(); // 立即回覆互動以避免超時

        const guildId = interaction.guild.id;
        const userTag = interaction.user.tag;

        logger.info(`Command /music_play triggered by ${userTag} in guild ${guildId}`);

        // 檢查用戶是否在語音頻道中
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            logger.warn(`User ${userTag} tried to play music without joining a voice channel.`);
            return interaction.editReply('❌ Please join a voice channel first.');
        }

        // 獲取伺服器專屬的播放器
        const player = new MusicPlayer(guildId);
        logger.info(`Retrieved music player for guild ${guildId}`);

        // 嘗試播放歌曲
        const playlist = player.getPlaylist();
        if (playlist.length === 0) {
            logger.warn(`User ${userTag} attempted to play music, but the playlist is empty.`);
            return interaction.editReply('🎵 The playlist is currently empty. Please add some songs first!');
        }

        logger.info(`Playing song "${playlist[0].title}" in guild ${guildId} for user ${userTag}`);
        await player.playSong(interaction); // 播放第一首歌曲
        logger.info(`Successfully started playing "${playlist[0].title}" in guild ${guildId}`);
    } catch (error) {
        logger.error(`Error in /music_play command in guild ${interaction.guild.id}: ${error.message}`);
        await interaction.editReply('❌ Unable to play the song. Please try again later.');
    }
}