import { SlashCommandBuilder } from 'discord.js';
import MusicPlayer from '../../features/music/musicPlayer.js';

// 定義 slash command 的結構
export const data = new SlashCommandBuilder()
    .setName('music_skip')
    .setDescription('Skip to the next song');

// 定義 slash command 執行函數
export async function execute(interaction) {
    try {
        const guildId = interaction.guild.id;

        // 獲取伺服器專屬播放器
        const player = new MusicPlayer(guildId);

        // 獲取播放列表
        const playlist = player.getPlaylist();
        if (playlist.length === 0) {
            return await interaction.reply('❌ The playlist is currently empty, unable to skip to the next song.');
        }

        // 嘗試跳到下一首歌曲
        const skipped = player.handleNextSong(interaction);

        // 回覆跳轉結果
        if (skipped) {
            await interaction.reply('✅ Skipped to the next song!');
        } else {
            await interaction.reply('❌ Unable to skip to the next song, please try again later.');
        }
    } catch (error) {
        console.error(`Error in /music_skip command: ${error.message}`);
        await interaction.reply('❌ An error occurred while executing the skip command, please try again later.');
    }
}