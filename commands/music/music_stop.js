import { SlashCommandBuilder } from 'discord.js';
import MusicPlayer from '../../features/music/musicPlayer.js';

// 定義 Slash Command 的結構
export const data = new SlashCommandBuilder()
    .setName('music_stop')
    .setDescription('Stop playing the current song');

// 定義 Slash Command 執行函數
export async function execute(interaction) {
    try {
        // 延遲回覆，防止超時
        await interaction.deferReply();

        // 獲取伺服器 ID 和播放器實例
        const guildId = interaction.guild.id;
        const player = new MusicPlayer(guildId);

        // 獲取播放列表
        const playlist = player.getPlaylist();
        if (playlist.length === 0) {
            return await interaction.editReply('❌ No songs are currently playing, the playlist is empty.');
        }

        // 停止播放
        player.stop(interaction);

        // 回覆停止播放的訊息
        await interaction.editReply('✅ Playback has been stopped, the playlist has been cleared.');
    } catch (error) {
        console.error(`Error in /music_stop command: ${error.message}`);
        // 回覆錯誤訊息
        await interaction.editReply('❌ An error occurred while stopping playback, please try again later.');
    }
}