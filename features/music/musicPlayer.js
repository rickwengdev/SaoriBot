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
import Logger from '../../features/errorhandle/errorhandle.js'; // Assume Logger is located here

/**
 * @class MusicPlayer
 * @description Manages music playback in Discord servers.
 */
class MusicPlayer {
    /**
     * Create a music player instance.
     * @param {string} guildId - Unique ID of the Discord server.
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
     * Initialize the playlist.
     */
    initPlaylist() {
        if (!playlists.has(this.guildId)) {
            playlists.set(this.guildId, []);
            this.logger.info(`New playlist created for guild: ${this.guildId}`);
        }
    }

    /**
     * Add a song to the playlist.
     */
    addSong(songUrl) {
        const playlist = playlists.get(this.guildId) || [];
        playlist.push(songUrl);
        playlists.set(this.guildId, playlist);
        savePlaylists();
        this.logger.info(`Song added to playlist for guild: ${this.guildId}, URL: ${songUrl}`);
    }

    /**
     * Get the playlist.
     */
    getPlaylist() {
        return playlists.get(this.guildId) || [];
    }

    /**
     * Remove a specific song from the playlist.
     * @param {string} songUrl - The URL of the song to remove.
     */
    removeSong(songUrl) {
        const playlist = playlists.get(this.guildId) || [];
        const updatedPlaylist = playlist.filter(url => url !== songUrl);
        playlists.set(this.guildId, updatedPlaylist);
        savePlaylists();
        this.logger.info(`Song removed from playlist for guild: ${this.guildId}, URL: ${songUrl}`);
    }
    
    /**
     * Remove the currently playing song.
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
     * Create an audio resource.
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
     * Play a song.
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
            const rawDescription = videoInfo?.videoDetails?.description;
            const saveDescription = typeof rawDescription === 'string' ? rawDescription.slice(0, 200) + '...' : 'No description available.';

            const embed = new EmbedBuilder()
                .setTitle(videoInfo.videoDetails.title)
                .setThumbnail(videoInfo.videoDetails.thumbnails[0]?.url || '')
                .setDescription(saveDescription)
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
     * Handle playing the next song.
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
     * Stop playback and clear the playlist.
     */
    stop(interaction) {
        const connection = getVoiceConnection(interaction.guild.id);
        if (connection) {
            connection.destroy();
            this.logger.info(`Playback stopped and connection destroyed for guild: ${this.guildId}`);
        }
        this.removeCurrentSong();
        this.songUrl = null;
        this.player.stop(true);
        this.logger.info(`Playlist cleared for guild: ${this.guildId}`);
    }
}

export default MusicPlayer;