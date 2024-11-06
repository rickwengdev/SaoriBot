import ServerConfig from '../../models/ServerConfig.js';

class MessageReactionHandler {
    constructor(client) {
        this.client = client;

        // 初始化事件處理
        this.client.on('messageReactionAdd', this.handleReactionAdd.bind(this));
        this.client.on('messageReactionRemove', this.handleReactionRemove.bind(this));
    }

    async handleReactionAdd(reaction, user) {
        if (user.bot || !reaction.message.guild) return;

        try {
            const { role, member } = await MessageReactionHandler.getRoleAndMember(reaction, user);
            if (member && role) {
                await member.roles.add(role);
                console.log(`Added role ${role.name} to ${member.user.tag} for reaction ${reaction.emoji.name || reaction.emoji.id}`);
            }
        } catch (error) {
            console.error('Error handling reaction add:', error);
        }
    }

    async handleReactionRemove(reaction, user) {
        if (user.bot || !reaction.message.guild) return;

        try {
            const { role, member } = await MessageReactionHandler.getRoleAndMember(reaction, user);
            if (member && role) {
                await member.roles.remove(role);
                console.log(`Removed role ${role.name} from ${member.user.tag} for reaction ${reaction.emoji.name || reaction.emoji.id}`);
            }
        } catch (error) {
            console.error('Error handling reaction remove:', error);
        }
    }

    // 靜態方法：處理反應角色數據並返回對應的角色和成員
    static async getRoleAndMember(reaction, user) {
        const guildId = reaction.message.guild.id;
        const messageId = reaction.message.id;
        const emojiKey = reaction.emoji.id || reaction.emoji.name;

        const serverConfig = await ServerConfig.findOne({ serverId: guildId });
        console.log("serverConfig", serverConfig);

        if (!serverConfig || !serverConfig.settings.reactionRoles) {
            console.warn(`No reaction roles found for guild ${guildId}`);
            return {};
        }

        const messageReactions = serverConfig.settings.reactionRoles[messageId];
        console.log("messageReactions", messageReactions);

        if (!messageReactions) {
            console.warn(`No matching reaction role found for message ID ${messageId}`);
            return {};
        }

        const reactionData = messageReactions;
        if (reactionData && reactionData.emoji === emojiKey) {
            const roleId = reactionData.role;
            const member = reaction.message.guild.members.cache.get(user.id);
            const role = reaction.message.guild.roles.cache.get(roleId);
            return { role, member };
        } else {
            console.warn(`No matching emoji found for message ID ${messageId} and emoji ${emojiKey}`);
            return {};
        }
    }
}

export { MessageReactionHandler };