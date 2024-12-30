import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import MusicPlayer from '../../features/music/musicPlayer.js';
import ytdl from '@distube/ytdl-core';

// 定義 Slash Command 的結構
export const data = new SlashCommandBuilder()
    .setName('music_remove')
    .setDescription('Remove a song from the playlist')
    .addStringOption(option =>
        option.setName('url')
            .setDescription('The URL of the song to remove from the playlist')
            .setRequired(true));

// 定義 Slash Command 執行函數
export async function execute(interaction) {
    try {
        await interaction.deferReply(); // 延遲回覆，防止超時

        // 獲取伺服器 ID 和播放器實例
        const guildId = interaction.guild.id;
        const player = new MusicPlayer(guildId);

        // 獲取指定的歌曲 URL
        const songUrl = interaction.options.getString('url');

        // 獲取播放列表並檢查是否包含該歌曲
        const playlist = player.getPlaylist();
        if (!playlist.includes(songUrl)) {
            return interaction.editReply(`❌ The song URL (${songUrl}) is not in the playlist.`);
        }

        // 使用 removeCurrentSong 函數刪除當前歌曲或指定歌曲
        player.removeSong(songUrl);

        // 獲取歌曲詳細信息
        let videoDetails;
        try {
            const info = await ytdl.getBasicInfo(songUrl);
            videoDetails = info?.videoDetails;
        } catch (error) {
            console.warn(`Unable to fetch song details: ${error.message}`);
        }

        // 回覆刪除成功的訊息
        if (videoDetails) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000') // YouTube 紅色
                .setTitle(videoDetails.title)
                .setThumbnail(videoDetails.thumbnails[0]?.url || '')
                .setDescription('🎵 This song has been successfully removed from the playlist.');
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.editReply(`🎵 The song has been successfully removed from the playlist: ${songUrl}`);
        }
    } catch (error) {
        console.error(`Error in /music_remove command: ${error.message}`);
        await interaction.editReply('❌ Unable to remove the song, please try again later.');
    }
}