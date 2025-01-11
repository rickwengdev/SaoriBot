import { Events } from 'discord.js';
import axios from 'axios';
import https from 'https';
import Logger from '../../features/errorhandle/errorhandle.js'; // 假設 Logger 位於此位置

/**
 * @class LoggingManager
 * @description 管理 Discord 伺服器的日誌功能，包括監聽成員更名和語音狀態更新。
 */
class LoggingManager {
    /**
     * 創建一個 LoggingManager 實例。
     * @param {import('discord.js').Client} client - Discord 客戶端實例。
     * @param {string} apiEndpoint - 獲取日誌頻道 ID 的 API 端點。
     */
    constructor(client, apiEndpoint) {
        this.client = client;
        this.apiEndpoint = apiEndpoint;
        this.logger = new Logger();

        this.init();
    }

    /**
     * 初始化日誌管理器並監聽相關事件。
     */
    init() {
        this.client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
            this.handleNicknameChange(oldMember, newMember);
            this.handleRoleChange(oldMember, newMember);
        });

        this.client.on(Events.VoiceStateUpdate, (oldState, newState) => {
            this.handleVoiceStateUpdate(oldState, newState);
        });
    }

    /**
     * 從 API 獲取日誌頻道 ID。
     * @param {string} guildId - Discord 伺服器 ID。
     * @returns {Promise<string|null>} 日誌頻道 ID，如果未配置返回 null。
     */
    async getLogChannelId(guildId) {
        try {
            const response = await axios.get(`${this.apiEndpoint}/api/${guildId}/log-channel`, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });
            this.logger.info(`Fetched log channel ID for guild ${guildId}: ${response.data?.config.log_channel_id || 'None'}`);
            return response.data?.config.log_channel_id || null;
        } catch (error) {
            this.logger.error(`Error fetching logChannelId for guild ${guildId}:`, error);
            return null;
        }
    }

    /**
     * 處理成員更改暱稱事件。
     */
    async handleNicknameChange(oldMember, newMember) {
        const guildId = newMember.guild.id;

        const logChannelId = await this.getLogChannelId(guildId);
        if (!logChannelId) return;

        const logChannel = newMember.guild.channels.cache.get(logChannelId);
        if (!logChannel) {
            this.logger.warn(`Log channel ${logChannelId} not found in guild ${guildId}.`);
            return;
        }

        if (oldMember.nickname !== newMember.nickname) {
            const oldNickname = oldMember.nickname || oldMember.user.username;
            const newNickname = newMember.nickname || newMember.user.username;

            try {
                await logChannel.send(`🔄 **${oldNickname}** changed their nickname to **${newNickname}**`);
                this.logger.info(`Logged nickname change in guild ${guildId}: ${oldNickname} → ${newNickname}`);
            } catch (error) {
                this.logger.error('Failed to log nickname change:', error);
            }
        }
    }

    /**
     * 處理語音狀態更新事件。
     */
    async handleVoiceStateUpdate(oldState, newState) {
        const guildId = newState.guild.id;

        const logChannelId = await this.getLogChannelId(guildId);
        if (!logChannelId) return;

        const logChannel = newState.guild.channels.cache.get(logChannelId);
        if (!logChannel) {
            this.logger.warn(`Log channel ${logChannelId} not found in guild ${guildId}.`);
            return;
        }

        try {
            if (!oldState.channel && newState.channel) {
                await logChannel.send(`🔊 **${newState.member.user.tag}** joined voice channel **${newState.channel.name}**`);
                this.logger.info(`User ${newState.member.user.tag} joined voice channel ${newState.channel.name} in guild ${guildId}`);
            } else if (oldState.channel && !newState.channel) {
                await logChannel.send(`🔇 **${oldState.member.user.tag}** left voice channel **${oldState.channel.name}**`);
                this.logger.info(`User ${oldState.member.user.tag} left voice channel ${oldState.channel.name} in guild ${guildId}`);
            }
        } catch (error) {
            this.logger.error('Failed to log voice state update:', error);
        }
    }

    /**
     * 處理成員身份組變更事件。
     */
    async handleRoleChange(oldMember, newMember) {
        const guildId = newMember.guild.id;

        const logChannelId = await this.getLogChannelId(guildId);
        if (!logChannelId) return;

        const logChannel = newMember.guild.channels.cache.get(logChannelId);
        if (!logChannel) {
            this.logger.warn(`Log channel ${logChannelId} not found in guild ${guildId}.`);
            return;
        }

        const oldRoles = new Set(oldMember.roles.cache.keys());
        const newRoles = new Set(newMember.roles.cache.keys());

        const addedRoles = [...newRoles].filter(role => !oldRoles.has(role));
        const removedRoles = [...oldRoles].filter(role => !newRoles.has(role));

        try {
            for (const roleId of addedRoles) {
                const role = newMember.guild.roles.cache.get(roleId);
                if (role) {
                    await logChannel.send(`➕ **${newMember.user.tag}** was given the role **${role.name}**`);
                    this.logger.info(`User ${newMember.user.tag} was given the role ${role.name} in guild ${guildId}`);
                }
            }

            for (const roleId of removedRoles) {
                const role = newMember.guild.roles.cache.get(roleId);
                if (role) {
                    await logChannel.send(`➖ **${newMember.user.tag}** was removed from the role **${role.name}**`);
                    this.logger.info(`User ${newMember.user.tag} was removed from the role ${role.name} in guild ${guildId}`);
                }
            }
        } catch (error) {
            this.logger.error('Failed to log role change:', error);
        }
    }
}

export default LoggingManager;