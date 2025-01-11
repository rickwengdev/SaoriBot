import axios from 'axios';
import https from 'https';
import Logger from '../../features/errorhandle/errorhandle.js'; // 假設 Logger 位於此位置

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
        this.logger = new Logger();

        // 初始化事件處理
        this.client.on('messageReactionAdd', this.handleReactionAdd.bind(this));
        this.client.on('messageReactionRemove', this.handleReactionRemove.bind(this));
    }

    /**
     * 處理添加反應的事件。
     */
    async handleReactionAdd(reaction, user) {
        if (user.bot || !reaction.message.guild) return;

        this.logger.info(`Handling reaction add by ${user.tag} in guild ${reaction.message.guild.id}`);

        try {
            const { role, member } = await this.getRoleAndMember(reaction, user);
            if (member && role) {
                await member.roles.add(role);
                this.logger.info(`Added role ${role.name} to ${user.tag} in guild ${reaction.message.guild.id}`);
            } else {
                this.logger.warn(`No matching role or member found for reaction add in guild ${reaction.message.guild.id}`);
            }
        } catch (error) {
            this.logger.error(`Error handling reaction add in guild ${reaction.message.guild.id}:`, error);
        }
    }

    /**
     * 處理移除反應的事件。
     */
    async handleReactionRemove(reaction, user) {
        if (user.bot || !reaction.message.guild) return;

        this.logger.info(`Handling reaction remove by ${user.tag} in guild ${reaction.message.guild.id}`);

        try {
            const { role, member } = await this.getRoleAndMember(reaction, user);
            if (member && role) {
                await member.roles.remove(role);
                this.logger.info(`Removed role ${role.name} from ${user.tag} in guild ${reaction.message.guild.id}`);
            } else {
                this.logger.warn(`No matching role or member found for reaction remove in guild ${reaction.message.guild.id}`);
            }
        } catch (error) {
            this.logger.error(`Error handling reaction remove in guild ${reaction.message.guild.id}:`, error);
        }
    }

    /**
     * 獲取對應的角色和成員。
     */
    async getRoleAndMember(reaction, user) {
        const guildId = reaction.message.guild.id;
        const messageId = reaction.message.id;
        const emojiKey = reaction.emoji.id || reaction.emoji.name;

        this.logger.info(`Fetching role and member for message ID ${messageId} and emoji ${emojiKey} in guild ${guildId}`);

        try {
            const response = await axios.get(`${this.apiEndpoint}/api/${guildId}/reaction-roles`, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            if (!response.data.success || !response.data.data) {
                this.logger.warn(`API response is invalid or unsuccessful for guild ${guildId}`);
                return { role: null, member: null };
            }

            const reactionRolesArray = response.data.data;
            const reactionRoles = reactionRolesArray.reduce((acc, item) => {
                if (!acc[item.message_id]) acc[item.message_id] = [];
                acc[item.message_id].push({
                    channel: item.channel_id,
                    emoji: item.emoji,
                    role: item.role_id,
                });
                return acc;
            }, {});

            if (!reactionRoles[messageId]) {
                this.logger.warn(`No matching reaction role configuration for message ID ${messageId} in guild ${guildId}`);
                return { role: null, member: null };
            }

            const reactionData = reactionRoles[messageId].find(data => data.emoji === emojiKey);
            if (!reactionData) {
                this.logger.warn(`No matching emoji configuration for message ID ${messageId} and emoji ${emojiKey} in guild ${guildId}`);
                return { role: null, member: null };
            }

            const roleId = reactionData.role;
            const member = reaction.message.guild.members.cache.get(user.id);
            const role = reaction.message.guild.roles.cache.get(roleId);

            return { role, member };
        } catch (error) {
            this.logger.error(`Error fetching reaction role configuration for guild ${guildId}:`, error);
            return { role: null, member: null };
        }
    }
}

export default MessageReactionHandler;