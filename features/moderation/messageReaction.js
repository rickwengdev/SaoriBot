import axios from 'axios';
import https from 'https';

/**
 * @class MessageReactionHandler
 * @description 管理消息反應的角色分配功能。
 */
class MessageReactionHandler {
    /**
     * 構造函數
     * @param {import('discord.js').Client} client - Discord 客戶端實例。
     * @param {string} apiEndpoint - 獲取反應角色配置的 API 端點。
     */
    constructor(client, apiEndpoint) {
        this.client = client;
        this.apiEndpoint = apiEndpoint;

        // 初始化事件處理
        this.client.on('messageReactionAdd', this.handleReactionAdd.bind(this));
        this.client.on('messageReactionRemove', this.handleReactionRemove.bind(this));
    }

    /**
     * 處理添加反應的事件。
     * @param {import('discord.js').MessageReaction} reaction - 消息反應對象。
     * @param {import('discord.js').User} user - 使用者對象。
     */
    async handleReactionAdd(reaction, user) {
        if (user.bot || !reaction.message.guild) return;

        try {
            const { role, member } = await this.getRoleAndMember(reaction, user);
            if (member && role) {
                await member.roles.add(role);
            }
        } catch (error) {
            console.error('Error handling reaction add:', error.message);
        }
    }

    /**
     * 處理移除反應的事件。
     * @param {import('discord.js').MessageReaction} reaction - 消息反應對象。
     * @param {import('discord.js').User} user - 使用者對象。
     */
    async handleReactionRemove(reaction, user) {
        if (user.bot || !reaction.message.guild) return;

        try {
            const { role, member } = await this.getRoleAndMember(reaction, user);
            if (member && role) {
                await member.roles.remove(role);
            }
        } catch (error) {
            console.error('Error handling reaction remove:', error.message);
        }
    }

    /**
     * 獲取對應的角色和成員。
     * @param {import('discord.js').MessageReaction} reaction - 消息反應對象。
     * @param {import('discord.js').User} user - 使用者對象。
     * @returns {Promise<{role: import('discord.js').Role|null, member: import('discord.js').GuildMember|null}>}
     */
    async getRoleAndMember(reaction, user) {
        const guildId = reaction.message.guild.id;
        const messageId = reaction.message.id;
        const emojiKey = reaction.emoji.id || reaction.emoji.name;
    
        try {
            // 從 API 獲取反應角色配置
            const response = await axios.get(`${this.apiEndpoint}/api/${guildId}/reaction-roles`, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }) // 忽略自簽名證書
            });
    
            // 檢查 API 響應是否成功並提取 data 數組
            if (!response.data.success || !response.data.data) {
                console.warn(`API response is invalid or unsuccessful for guild ${guildId}`);
                return { role: null, member: null };
            }
    
            const reactionRolesArray = response.data.data; // 提取數據數組
    
            // 按 message_id 分組 reactionRoles 數據
            const reactionRoles = reactionRolesArray.reduce((acc, item) => {
                if (!acc[item.message_id]) acc[item.message_id] = [];
                acc[item.message_id].push({
                    channel: item.channel_id,
                    emoji: item.emoji,
                    role: item.role_id,
                });
                return acc;
            }, {});
    
            // 檢查是否存在對應的 messageId 配置
            if (!reactionRoles[messageId]) {
                console.warn(`No matching reaction role configuration for message ID ${messageId}`);
                return { role: null, member: null };
            }
    
            // 匹配 emojiKey 對應的 reaction 數據
            const reactionData = reactionRoles[messageId].find(data => data.emoji === emojiKey);
            if (!reactionData) {
                console.warn(`No matching emoji configuration for message ID ${messageId} and emoji ${emojiKey}`);
                return { role: null, member: null };
            }
    
            // 查找使用者和角色
            const roleId = reactionData.role;
            const member = reaction.message.guild.members.cache.get(user.id);
            const role = reaction.message.guild.roles.cache.get(roleId);
    
            return { role, member };
        } catch (error) {
            console.error(`Error fetching reaction role configuration for guild ${guildId}:`, error.message);
            return { role: null, member: null };
        }
    }
}

export default MessageReactionHandler;