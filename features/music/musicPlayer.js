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
        /** @type {string} */
        this.guildId = guildId;

        /** @type {import('@discordjs/voice').AudioPlayer} */
        this.player = createAudioPlayer();

        /** @type {string|null} */
        this.songUrl = null;

        this.initPlaylist();
    }

    /**
     * 初始化播放列表。如果該伺服器的播放列表不存在，則創建一個新的。
     */
    initPlaylist() {
        if (!playlists.has(this.guildId)) {
            playlists.set(this.guildId, []);
        }
    }

    /**
     * 將歌曲添加到播放列表中。
     * @param {string} songUrl - 要添加的歌曲 URL。
     */
    addSong(songUrl) {
        const playlist = playlists.get(this.guildId) || [];
        playlist.push(songUrl);
        playlists.set(this.guildId, playlist);
        savePlaylists();
    }

    /**
     * 獲取當前播放列表。
     * @returns {string[]} 當前播放列表中的歌曲 URL 數組。
     */
    getPlaylist() {
        return playlists.get(this.guildId) || [];
    }

    /**
     * 移除當前正在播放的歌曲。
     */
    removeCurrentSong() {
        if (this.songUrl) {
            const playlist = playlists.get(this.guildId) || [];
            playlists.set(this.guildId, playlist.filter(url => url !== this.songUrl));
            savePlaylists();
        }
    }

    /**
     * 創建音頻資源。
     * @param {string} songUrl - 歌曲 URL。
     * @returns {Promise<import('@discordjs/voice').AudioResource>} 返回創建的音頻資源。
     * @throws {Error} 如果音頻資源創建失敗，將拋出異常。
     */
    async createAudioResource(songUrl) {
        try {
            const stream = ytdl(songUrl, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
            const { stream: probeStream, type } = await demuxProbe(stream);
            return createAudioResource(probeStream, { inputType: type });
        } catch (error) {
            console.error('Error creating audio resource:', error.message);
            throw error;
        }
    }

    /**
     * 播放播放列表中的當前歌曲。
     * @param {import('discord.js').CommandInteraction} interaction - Discord 的交互對象。
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

            let connection = getVoiceConnection(interaction.guild.id);
            if (!connection) {
                connection = joinVoiceChannel({
                    channelId: voiceChannelId,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });
                connection.subscribe(this.player);
            }

            const resource = await this.createAudioResource(this.songUrl);
            this.player.play(resource);

            this.player.once('idle', () => this.handleNextSong(interaction));
        } catch (error) {
            errorhandler(error, interaction, '❌ Unable to play the song, please try again later.');
        }
    }

    /**
     * 播放下一首歌曲。如果播放列表為空，則停止播放並斷開連接。
     * @param {import('discord.js').CommandInteraction} interaction - Discord 的交互對象。
     */
    async handleNextSong(interaction) {
        this.removeCurrentSong();
        this.songUrl = this.getPlaylist()[0];

        if (this.songUrl) {
            await this.playSong(interaction);
        } else {
            const connection = getVoiceConnection(interaction.guild.id);
            if (connection) connection.destroy();

            console.log(`Music playback stopped for guild: ${this.guildId}`);
        }
    }

    /**
     * 跳過當前歌曲並播放下一首。
     * @param {import('discord.js').CommandInteraction} interaction - Discord 的交互對象。
     */
    async skipToNextSong(interaction) {
        try {
            await interaction.deferReply();

            const playlist = this.getPlaylist();
            if (playlist.length <= 1) {
                await interaction.editReply('❌ There are no more songs in the playlist to skip.');
                return;
            }

            this.removeCurrentSong();
            this.songUrl = playlist[0];
            await this.playSong(interaction);

            await interaction.editReply('✅ Skipped to the next song!');
        } catch (error) {
            console.error('Error skipping to the next song:', error.message);
            await interaction.editReply('❌ Unable to skip to the next song, please try again later.');
        }
    }

    /**
     * 停止播放當前歌曲並清空播放列表。
     * @param {import('discord.js').CommandInteraction} interaction - Discord 的交互對象。
     */
    stop(interaction) {
        this.player.stop();
        this.songUrl = null;

        const connection = getVoiceConnection(interaction.guild.id);
        if (connection) connection.destroy();

        console.log(`Music playback stopped for guild: ${this.guildId}`);
    }
}

export default MusicPlayer;