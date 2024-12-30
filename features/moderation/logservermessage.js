import { Events } from 'discord.js';
import axios from 'axios';
import https from 'https';

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
                httpsAgent: new https.Agent({ rejectUnauthorized: false })
            });
            return response.data?.config.log_channel_id || null;
        } catch (error) {
            console.error(`Error fetching logChannelId for guild ${guildId}:`, error.message);
            return null;
        }
    }

    /**
     * 處理成員更改暱稱事件。
     * @param {import('discord.js').GuildMember} oldMember - 更新前的成員狀態。
     * @param {import('discord.js').GuildMember} newMember - 更新後的成員狀態。
     */
    async handleNicknameChange(oldMember, newMember) {
        const guildId = newMember.guild.id;

        // 獲取日誌頻道 ID
        const logChannelId = await this.getLogChannelId(guildId);
        if (!logChannelId) return;

        const logChannel = newMember.guild.channels.cache.get(logChannelId);
        if (!logChannel) {
            console.warn(`Log channel ${logChannelId} not found in guild ${guildId}.`);
            return;
        }

        // 檢查暱稱是否更改
        if (oldMember.nickname !== newMember.nickname) {
            const oldNickname = oldMember.nickname || oldMember.user.username;
            const newNickname = newMember.nickname || newMember.user.username;

            try {
                await logChannel.send(`🔄 **${oldNickname}** changed their nickname to **${newNickname}**`);
            } catch (error) {
                console.error('Failed to log nickname change:', error.message);
            }
        }
    }

    /**
     * 處理語音狀態更新事件。
     * @param {import('discord.js').VoiceState} oldState - 更新前的語音狀態。
     * @param {import('discord.js').VoiceState} newState - 更新後的語音狀態。
     */
    async handleVoiceStateUpdate(oldState, newState) {
        const guildId = newState.guild.id;

        // 獲取日誌頻道 ID
        const logChannelId = await this.getLogChannelId(guildId);
        if (!logChannelId) return;

        const logChannel = newState.guild.channels.cache.get(logChannelId);
        if (!logChannel) {
            console.warn(`Log channel ${logChannelId} not found in guild ${guildId}.`);
            return;
        }

        try {
            // 成員加入語音頻道
            if (!oldState.channel && newState.channel) {
                await logChannel.send(`🔊 **${newState.member.user.tag}** joined voice channel **${newState.channel.name}**`);
            }
            // 成員離開語音頻道
            else if (oldState.channel && !newState.channel) {
                await logChannel.send(`🔇 **${oldState.member.user.tag}** left voice channel **${oldState.channel.name}**`);
            }
        } catch (error) {
            console.error('Failed to log voice state update:', error.message);
        }
    }

    /**
     * 處理成員身份組變更事件。
     * @param {import('discord.js').GuildMember} oldMember - 更新前的成員狀態。
     * @param {import('discord.js').GuildMember} newMember - 更新後的成員狀態。
     */
    async handleRoleChange(oldMember, newMember) {
        const guildId = newMember.guild.id;

        // 獲取日誌頻道 ID
        const logChannelId = await this.getLogChannelId(guildId);
        if (!logChannelId) return;

        const logChannel = newMember.guild.channels.cache.get(logChannelId);
        if (!logChannel) {
            console.warn(`Log channel ${logChannelId} not found in guild ${guildId}.`);
            return;
        }

        // 獲取角色變更
        const oldRoles = new Set(oldMember.roles.cache.keys());
        const newRoles = new Set(newMember.roles.cache.keys());

        const addedRoles = [...newRoles].filter(role => !oldRoles.has(role));
        const removedRoles = [...oldRoles].filter(role => !newRoles.has(role));

        try {
            // 記錄添加的角色
            for (const roleId of addedRoles) {
                const role = newMember.guild.roles.cache.get(roleId);
                if (role) {
                    await logChannel.send(`➕ **${newMember.user.tag}** was given the role **${role.name}**`);
                }
            }

            // 記錄移除的角色
            for (const roleId of removedRoles) {
                const role = newMember.guild.roles.cache.get(roleId);
                if (role) {
                    await logChannel.send(`➖ **${newMember.user.tag}** was removed from the role **${role.name}**`);
                }
            }
        } catch (error) {
            console.error('Failed to log role change:', error.message);
        }
    }
}

export default LoggingManager;