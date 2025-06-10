import axios from 'axios';
import https from 'https';
import Logger from '../../features/errorhandle/errorhandle.js';

/**
 * @class MessageReactionHandler
 * @description Manages role assignment based on message reactions.
 */
class MessageReactionHandler {
    /**
     * Constructor
     * @param {import('discord.js').Client} client - Discord client instance.
     * @param {string} apiEndpoint - API endpoint to fetch reaction role configurations.
     */
    constructor(client, apiEndpoint) {
        this.client = client;
        this.apiEndpoint = apiEndpoint;
        this.logger = new Logger();

        // Initialize event handlers
        this.client.on('messageReactionAdd', this.handleReactionAdd.bind(this));
        this.client.on('messageReactionRemove', this.handleReactionRemove.bind(this));
    }

    /**
     * Handles the addition of a reaction.
     */
    async handleReactionAdd(reaction, user) {
        if (user.bot) return;

        try {
            if (reaction.partial) await reaction.fetch();
            if (user.partial) await user.fetch();
            if (!reaction.message.guild) return;

            this.logger.info(`Handling reaction add by ${user.tag} in guild ${reaction.message.guild.id}`);

            const { role, member } = await this.getRoleAndMember(reaction, user);
            if (member && role) {
                await member.roles.add(role);
                this.logger.info(`Added role ${role.name} to ${user.tag} in guild ${reaction.message.guild.id}`);
            } else {
                this.logger.warn(`No matching role or member found for reaction add in guild ${reaction.message.guild.id}`);
            }
        } catch (error) {
            this.logger.error(`Error handling reaction add in guild ${reaction.message.guild?.id ?? 'unknown'}:`, error);
        }
    }

    /**
     * Handles the removal of a reaction.
     */
    async handleReactionRemove(reaction, user) {
        if (user.bot) return;

        try {
            if (reaction.partial) await reaction.fetch();
            if (user.partial) await user.fetch();
            if (!reaction.message.guild) return;

            this.logger.info(`Handling reaction remove by ${user.tag} in guild ${reaction.message.guild.id}`);

            const { role, member } = await this.getRoleAndMember(reaction, user);
            if (member && role) {
                await member.roles.remove(role);
                this.logger.info(`Removed role ${role.name} from ${user.tag} in guild ${reaction.message.guild.id}`);
            } else {
                this.logger.warn(`No matching role or member found for reaction remove in guild ${reaction.message.guild.id}`);
            }
        } catch (error) {
            this.logger.error(`Error handling reaction remove in guild ${reaction.message.guild?.id ?? 'unknown'}:`, error);
        }
    }

    /**
     * Retrieves the corresponding role and member.
     */
    async getRoleAndMember(reaction, user) {
        const guild = reaction.message.guild;
        const guildId = guild.id;
        const messageId = reaction.message.id;
        const emojiKey = reaction.emoji.id || reaction.emoji.name;

        this.logger.info(`Fetching role and member for message ID ${messageId}, emoji ${emojiKey} in guild ${guildId}`);

        try {
            const response = await axios.get(`${this.apiEndpoint}/api/${guildId}/reaction-roles`, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            if (!response.data.success || !response.data.data) {
                this.logger.warn(`API response invalid for guild ${guildId}`);
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
                this.logger.warn(`No config for message ID ${messageId} in guild ${guildId}`);
                return { role: null, member: null };
            }

            const reactionData = reactionRoles[messageId].find(data => data.emoji === emojiKey);
            if (!reactionData) {
                this.logger.warn(`No matching emoji ${emojiKey} for message ID ${messageId} in guild ${guildId}`);
                return { role: null, member: null };
            }

            const roleId = reactionData.role;
            const member = await guild.members.fetch(user.id).catch(() => null);
            const role = await guild.roles.fetch(roleId).catch(() => null);

            if (!member) this.logger.warn(`Member ${user.id} not found in guild ${guildId}`);
            if (!role) this.logger.warn(`Role ${roleId} not found in guild ${guildId}`);

            return { role, member };
        } catch (error) {
            this.logger.error(`Error fetching reaction role config for guild ${guildId}:`, error);
            return { role: null, member: null };
        }
    }
}

export default MessageReactionHandler;