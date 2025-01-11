import {
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    getVoiceConnection,
    demuxProbe
} from '@discordjs/voice';
import { EmbedBuilder } from 'discord.js';
import ytdl from '@distube/ytdl-core';
import { savePlaylists, playlists } from './playlistManager.js';
import { errorhandler } from './errorHandler.js';
import Logger from '../../features/errorhandle/errorhandle.js'; // 假設 Logger 位於此位置

/**
 * @class MusicPlayer
 * @description 管理 Discord 伺服器的音樂播放功能。
 */
class MusicPlayer {
    /**
     * 創建一個音樂播放器實例。
     * @param {string} guildId - Discord 伺服器的唯一 ID。
     */
    constructor(guildId) {
        this.guildId = guildId;
        this.player = createAudioPlayer();
        this.songUrl = null;
        this.logger = new Logger();

        this.initPlaylist();
        this.logger.info(`MusicPlayer initialized for guild: ${guildId}`);
    }

    /**
     * 初始化播放列表。
     */
    initPlaylist() {
        if (!playlists.has(this.guildId)) {
            playlists.set(this.guildId, []);
            this.logger.info(`New playlist created for guild: ${this.guildId}`);
        }
    }

    /**
     * 添加歌曲到播放列表。
     */
    addSong(songUrl) {
        const playlist = playlists.get(this.guildId) || [];
        playlist.push(songUrl);
        playlists.set(this.guildId, playlist);
        savePlaylists();
        this.logger.info(`Song added to playlist for guild: ${this.guildId}, URL: ${songUrl}`);
    }

    /**
     * 獲取播放列表。
     */
    getPlaylist() {
        return playlists.get(this.guildId) || [];
    }

    /**
     * 移除當前歌曲。
     */
    removeCurrentSong() {
        if (this.songUrl) {
            const playlist = playlists.get(this.guildId) || [];
            playlists.set(this.guildId, playlist.filter(url => url !== this.songUrl));
            savePlaylists();
            this.logger.info(`Removed current song from playlist for guild: ${this.guildId}`);
        }
    }

    /**
     * 創建音頻資源。
     */
    async createAudioResource(songUrl) {
        try {
            const stream = ytdl(songUrl, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
            const { stream: probeStream, type } = await demuxProbe(stream);
            this.logger.info(`Audio resource created for song: ${songUrl}`);
            return createAudioResource(probeStream, { inputType: type });
        } catch (error) {
            this.logger.error(`Error creating audio resource for song: ${songUrl}`, error);
            throw error;
        }
    }

    /**
     * 播放歌曲。
     */
    async playSong(interaction) {
        const voiceChannelId = interaction.member?.voice.channelId;
        if (!voiceChannelId) {
            await interaction.editReply('❌ Please join a voice channel first!');
            return;
        }

        this.songUrl = this.getPlaylist()[0];
        if (!this.songUrl) {
            await interaction.editReply('❌ The playlist is empty, please add a song!');
            return;
        }

        try {
            const videoInfo = await ytdl.getBasicInfo(this.songUrl);
            const embed = new EmbedBuilder()
                .setTitle(videoInfo.videoDetails.title)
                .setThumbnail(videoInfo.videoDetails.thumbnails[0]?.url || '')
                .setDescription(videoInfo.videoDetails.description.slice(0, 200) + '...')
                .setColor('#FF0000');

            await interaction.editReply({ content: '🎵 Now playing:', embeds: [embed] });
            this.logger.info(`Playing song in guild: ${this.guildId}, URL: ${this.songUrl}`);

            let connection = getVoiceConnection(interaction.guild.id);
            if (!connection) {
                connection = joinVoiceChannel({
                    channelId: voiceChannelId,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });
                connection.subscribe(this.player);
                this.logger.info(`Voice connection established for guild: ${this.guildId}`);
            }

            const resource = await this.createAudioResource(this.songUrl);
            this.player.play(resource);

            this.player.once('idle', () => this.handleNextSong(interaction));
        } catch (error) {
            this.logger.error(`Error playing song in guild: ${this.guildId}`, error);
            errorhandler(error, interaction, '❌ Unable to play the song, please try again later.');
        }
    }

    /**
     * 播放下一首歌曲。
     */
    async handleNextSong(interaction) {
        this.removeCurrentSong();
        this.songUrl = this.getPlaylist()[0];

        if (this.songUrl) {
            await this.playSong(interaction);
        } else {
            const connection = getVoiceConnection(interaction.guild.id);
            if (connection) connection.destroy();

            this.logger.info(`Music playback stopped for guild: ${this.guildId}`);
        }
    }

    /**
     * 跳過當前歌曲。
     */
    async skipToNextSong(interaction) {
        try {
            await interaction.deferReply();

            const playlist = this.getPlaylist();
            if (playlist.length <= 1) {
                await interaction.editReply('❌ There are no more songs in the playlist to skip.');
                this.logger.warn(`Skip attempted but no more songs in playlist for guild: ${this.guildId}`);
                return;
            }

            this.removeCurrentSong();
            this.songUrl = playlist[0];
            await this.playSong(interaction);

            await interaction.editReply('✅ Skipped to the next song!');
            this.logger.info(`Skipped to the next song in guild: ${this.guildId}`);
        } catch (error) {
            this.logger.error(`Error skipping to the next song in guild: ${this.guildId}`, error);
            await interaction.editReply('❌ Unable to skip to the next song, please try again later.');
        }
    }

    /**
     * 停止播放。
     */
    stop(interaction) {
        this.player.stop();
        this.songUrl = null;

        const connection = getVoiceConnection(interaction.guild.id);
        if (connection) connection.destroy();

        this.logger.info(`Music playback stopped and connection destroyed for guild: ${this.guildId}`);
    }
}

export default MusicPlayer;