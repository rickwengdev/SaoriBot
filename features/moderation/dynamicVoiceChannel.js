import { PermissionsBitField } from 'discord.js';
import axios from 'axios';
import https from 'https';

/**
 * @class DynamicVoiceChannelManager
 * @description 管理動態語音頻道的創建和刪除。
 */
class DynamicVoiceChannelManager {
    /**
     * 構造函數
     * @param {import('discord.js').Client} client - Discord 客戶端實例。
     * @param {string} apiEndpoint - 獲取動態語音頻道觸發 ID 的 API 端點。
     */
    constructor(client, apiEndpoint) {
        this.client = client;
        this.apiEndpoint = apiEndpoint;

        this.init();
    }

    /**
     * 初始化管理器並監聽 `voiceStateUpdate` 事件。
     */
    init() {
        this.client.on('voiceStateUpdate', (oldState, newState) => {
            this.handleVoiceStateUpdate(oldState, newState);
        });
    }

    /**
     * 處理語音狀態更新事件。
     * @param {import('discord.js').VoiceState} oldState - 更新前的語音狀態。
     * @param {import('discord.js').VoiceState} newState - 更新後的語音狀態。
     */
    async handleVoiceStateUpdate(oldState, newState) {
        try {
            const guildId = newState.guild.id;

            // 獲取觸發頻道 ID
            const triggerChannelId = await this.getTriggerChannelId(guildId);
            if (!triggerChannelId) {
                console.warn(`Guild ${guildId} does not have a configured trigger channel ID`);
                return;
            }

            // 使用者加入觸發頻道
            if (newState.channelId === triggerChannelId) {
                await this.createDynamicChannel(newState);
            }

            // 檢查舊頻道是否需要刪除
            if (oldState.channel) {
                await this.deleteEmptyChannel(oldState.channel);
            }
        } catch (error) {
            console.error('Error handling voice state update:', error.message);
        }
    }

    /**
     * 從 API 獲取觸發頻道 ID。
     * @param {string} guildId - Discord 伺服器 ID。
     * @returns {Promise<string|null>} 觸發頻道 ID，如果未配置返回 null。
     */
    async getTriggerChannelId(guildId) {
        try {
            const response = await axios.get(`${this.apiEndpoint}/api/${guildId}/dynamic-voice-channels`, {httpsAgent: new https.Agent({rejectUnauthorized: false})});
            return response.data?.config.base_channel_id || null;
        } catch (error) {
            console.error(`Error fetching triggerChannelId for guild ${guildId}:`, error.message);
            return null;
        }
    }

    /**
     * 創建動態語音頻道並將使用者移動到該頻道。
     * @param {import('discord.js').VoiceState} state - 使用者的語音狀態。
     */
    async createDynamicChannel(state) {
        const member = state.member;
        if (!member) return;

        // 根據使用者名稱生成頻道名稱
        let channelName = member.user.username.trim().replace(/[^a-zA-Z0-9\-_ ]/g, '');
        if (!channelName) channelName = 'Default Channel';

        try {
            const channel = await state.guild.channels.create({
                name: `${channelName}'s Channel`,
                type: 2, // 語音頻道
                parent: state.channel.parentId,
                permissionOverwrites: [
                    {
                        id: member.id,
                        allow: [
                            PermissionsBitField.Flags.ManageChannels,
                            PermissionsBitField.Flags.MoveMembers,
                            PermissionsBitField.Flags.MuteMembers,
                            PermissionsBitField.Flags.DeafenMembers
                        ],
                    },
                ],
            });

            // 將使用者移動到新頻道
            await member.voice.setChannel(channel);
            console.log(`Created and moved member to channel: ${channel.id}`);
        } catch (error) {
            console.error('Failed to create dynamic channel:', error.message);
        }
    }

    /**
     * 刪除空的動態語音頻道。
     * @param {import('discord.js').VoiceChannel} channel - 要檢查的語音頻道。
     */
    async deleteEmptyChannel(channel) {
        try {
            // 檢查頻道是否為空且為動態創建的頻道
            if (channel.members.size === 0 && channel.name.includes("'s Channel")) {
                await channel.delete();
                console.log(`Deleted empty channel: ${channel.id}`);
            }
        } catch (error) {
            console.error('Failed to delete empty channel:', error.message);
        }
    }
}

export default DynamicVoiceChannelManager;