import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import axios from 'axios';
import https from 'https';

/**
 * @class GuildMembers
 * @description 處理成員加入和離開事件，並發送歡迎或離開消息。
 */
class GuildMembers {
    /**
     * @constructor
     * @param {import('discord.js').Client} client - Discord 客戶端實例。
     * @param {string} apiEndpoint - 獲取歡迎和離開頻道配置的 API 端點。
     */
    constructor(client, apiEndpoint) {
        this.client = client;
        this.apiEndpoint = apiEndpoint;

        // 綁定事件處理器
        this.registerEvents();
    }

    /**
     * 註冊事件監聽器。
     */
    registerEvents() {
        // 移除已存在的事件監聽器以防止重複綁定
        this.client.removeAllListeners('guildMemberAdd');
        this.client.removeAllListeners('guildMemberRemove');

        // 新增 `guildMemberAdd` 事件監聽器
        this.client.on('guildMemberAdd', async (member) => {
            try {
                await this.handleGuildMemberAdd(member);
            } catch (error) {
                console.error('An error occurred in guildMemberAdd event:', error.message);
            }
        });

        // 新增 `guildMemberRemove` 事件監聽器
        this.client.on('guildMemberRemove', async (member) => {
            try {
                await this.handleGuildMemberRemove(member);
            } catch (error) {
                console.error('An error occurred in guildMemberRemove event:', error.message);
            }
        });
    }

    /**
     * 從 API 獲取頻道配置。
     * @param {string} guildId - Discord 伺服器 ID。
     * @returns {Promise<Object|null>} 返回包含歡迎和離開頻道 ID 的對象，如果未配置返回 null。
     */
    async fetchGuildConfig(guildId) {
        try {
            const response = await axios.get(`${this.apiEndpoint}/api/${guildId}/getWelcomeLeave`, {httpsAgent: new https.Agent({rejectUnauthorized: false})}
            );
            return response.data.config || null;
        } catch (error) {
            console.error(`Error fetching guild configuration for guild ${guildId}:`, error.message);
            return null;
        }
    }

    /**
     * 處理成員加入事件。
     * @param {import('discord.js').GuildMember} member - 加入的成員對象。
     */
    async handleGuildMemberAdd(member) {
        const guildConfig = await this.fetchGuildConfig(member.guild.id);
        if (!guildConfig || !guildConfig.welcome_channel_id) {
            console.log('❕Welcome channel configuration not found.');
            return;
        }

        const welcomeChannel = this.client.channels.cache.get(guildConfig.welcome_channel_id);
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        
        const welcomeBannerPath = path.join(__dirname, 'welcome-banner.png');
        if (!welcomeChannel) {
            console.log('❕Welcome channel not found.');
            return;
        }

        let bannerBuffer;
        try {
            bannerBuffer = await fs.promises.readFile(welcomeBannerPath);
        } catch (error) {
            console.error('Unable to read welcome banner file:', error.message);
        }

        const embed = new EmbedBuilder()
            .setTitle(`Welcome ${member.user.tag} to the server!`)
            .setDescription(`${member.user.toString()} welcome to the server!`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, format: 'png', size: 256 }));

        const messageOptions = { embeds: [embed] };
        if (bannerBuffer) {
            messageOptions.files = [new AttachmentBuilder(bannerBuffer, 'welcome-banner.png')];
        }

        try {
            await welcomeChannel.send(messageOptions);
        } catch (error) {
            console.error('An error occurred while sending the welcome message or banner:', error.message);
        }
    }

    /**
     * 處理成員離開事件。
     * @param {import('discord.js').GuildMember} member - 離開的成員對象。
     */
    async handleGuildMemberRemove(member) {
        const guildConfig = await this.fetchGuildConfig(member.guild.id);
        if (!guildConfig || !guildConfig.leave_channel_id) {
            console.log('❕Leave channel configuration not found.');
            return;
        }

        const leaveChannel = this.client.channels.cache.get(guildConfig.leave_channel_id);

        if (!leaveChannel) {
            console.log('❕Leave channel not found.');
            return;
        }

        try {
            await leaveChannel.send(`**${member.user.tag}** has left the server.`);
        } catch (error) {
            console.error('An error occurred while sending the leave message:', error.message);
        }
    }
}

export default GuildMembers;