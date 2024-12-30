import { SlashCommandBuilder } from 'discord.js';
import MusicPlayer from '../../features/music/musicPlayer.js';

// 定義 Slash Command
export const data = new SlashCommandBuilder()
    .setName('music_play')
    .setDescription('Play the first song in the playlist');

// 定義 Slash Command 執行函數
export async function execute(interaction) {
    try {
        await interaction.deferReply(); // 立即回覆互動以避免超時

        const guildId = interaction.guild.id;

        // 檢查用戶是否在語音頻道中
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.editReply('❌ Please join a voice channel first.');
        }

        // 獲取伺服器專屬的播放器
        const player = new MusicPlayer(guildId);

        // 嘗試播放歌曲
        const playlist = player.getPlaylist();
        if (playlist.length === 0) {
            return interaction.editReply('🎵 The playlist is currently empty. Please add some songs first!');
        }

        await player.playSong(interaction); // 播放第一首歌曲
    } catch (error) {
        console.error(`Error in /music_play command: ${error.message}`);
        await interaction.editReply('❌ Unable to play the song. Please try again later.');
    }
}