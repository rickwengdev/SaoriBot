import { SlashCommandBuilder } from 'discord.js';
import MusicPlayer from '../../features/music/musicPlayer.js';
import Logger from '../../features/errorhandle/errorhandle.js';

// 初始化 Logger
const logger = new Logger();

// 定義 Slash Command 的結構
export const data = new SlashCommandBuilder()
    .setName('music_stop')
    .setDescription('Stop playing the current song');

// 定義 Slash Command 執行函數
export async function execute(interaction) {
    try {
        // 延遲回覆，防止超時
        await interaction.deferReply();

        const guildId = interaction.guild.id;
        const userTag = interaction.user.tag;

        logger.info(`Command /music_stop triggered by ${userTag} in guild ${guildId}`);

        // 獲取伺服器專屬播放器
        const player = new MusicPlayer(guildId);
        logger.info(`Retrieved music player for guild ${guildId}`);

        // 獲取播放列表
        const playlist = player.getPlaylist();
        if (playlist.length === 0) {
            logger.warn(`User ${userTag} attempted to stop playback, but the playlist is empty in guild ${guildId}`);
            return await interaction.editReply('❌ No songs are currently playing, the playlist is empty.');
        }

        logger.info(`Stopping playback in guild ${guildId}, triggered by ${userTag}`);

        // 停止播放
        player.stop(interaction);

        logger.info(`Playback stopped and playlist cleared in guild ${guildId} by ${userTag}`);

        // 回覆停止播放的訊息
        await interaction.editReply('✅ Playback has been stopped, the playlist has been cleared.');
    } catch (error) {
        logger.error(`Error in /music_stop command in guild ${interaction.guild.id}: ${error.message}`);
        // 回覆錯誤訊息
        await interaction.editReply('❌ An error occurred while stopping playback, please try again later.');
    }
}