import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import axios from 'axios';
import https from 'https';
import Logger from '../../features/errorhandle/errorhandle.js'; // 假設 Logger 類位於此處

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
        this.logger = new Logger();

        // 註冊事件處理
        this.registerEvents();
    }

    /**
     * 註冊事件監聽器。
     */
    registerEvents() {
        this.client.removeAllListeners('guildMemberAdd');
        this.client.removeAllListeners('guildMemberRemove');

        this.client.on('guildMemberAdd', async (member) => {
            try {
                this.logger.info(`New member joined: ${member.user.tag} (ID: ${member.user.id}) in guild ${member.guild.id}`);
                await this.handleGuildMemberAdd(member);
            } catch (error) {
                this.logger.error(`Error in guildMemberAdd event for member ${member.user.tag}:`, error);
            }
        });

        this.client.on('guildMemberRemove', async (member) => {
            try {
                this.logger.info(`Member left: ${member.user.tag} (ID: ${member.user.id}) in guild ${member.guild.id}`);
                await this.handleGuildMemberRemove(member);
            } catch (error) {
                this.logger.error(`Error in guildMemberRemove event for member ${member.user.tag}:`, error);
            }
        });
    }

    /**
     * 從 API 獲取頻道配置。
     */
    async fetchGuildConfig(guildId) {
        try {
            const response = await axios.get(`${this.apiEndpoint}/api/${guildId}/getWelcomeLeave`, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false })
            });
            this.logger.info(`Fetched guild configuration for guild ${guildId}`);
            return response.data.config || null;
        } catch (error) {
            this.logger.error(`Error fetching guild configuration for guild ${guildId}:`, error);
            return null;
        }
    }

    /**
     * 處理成員加入事件。
     */
    async handleGuildMemberAdd(member) {
        const guildConfig = await this.fetchGuildConfig(member.guild.id);
        if (!guildConfig || !guildConfig.welcome_channel_id) {
            this.logger.warn(`No welcome channel configured for guild ${member.guild.id}`);
            return;
        }

        const welcomeChannel = this.client.channels.cache.get(guildConfig.welcome_channel_id);
        if (!welcomeChannel) {
            this.logger.warn(`Welcome channel not found for guild ${member.guild.id}`);
            return;
        }

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const welcomeBannerPath = path.join(__dirname, 'welcome-banner.png');

        let bannerBuffer = null;
        try {
            bannerBuffer = await fs.promises.readFile(welcomeBannerPath);
            this.logger.info('Welcome banner successfully read.');
        } catch (error) {
            this.logger.warn('Unable to read welcome banner file, proceeding without banner:', error.message);
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
            this.logger.info(`Welcome message sent for member ${member.user.tag} in guild ${member.guild.id}`);
        } catch (error) {
            this.logger.error(`Error sending welcome message for member ${member.user.tag} in guild ${member.guild.id}:`, error);
        }
    }

    /**
     * 處理成員離開事件。
     */
    async handleGuildMemberRemove(member) {
        const guildConfig = await this.fetchGuildConfig(member.guild.id);
        if (!guildConfig || !guildConfig.leave_channel_id) {
            this.logger.warn(`No leave channel configured for guild ${member.guild.id}`);
            return;
        }

        const leaveChannel = this.client.channels.cache.get(guildConfig.leave_channel_id);
        if (!leaveChannel) {
            this.logger.warn(`Leave channel not found for guild ${member.guild.id}`);
            return;
        }

        try {
            await leaveChannel.send(`**${member.user.tag}** has left the server.`);
            this.logger.info(`Leave message sent for member ${member.user.tag} in guild ${member.guild.id}`);
        } catch (error) {
            this.logger.error(`Error sending leave message for member ${member.user.tag} in guild ${member.guild.id}:`, error);
        }
    }
}

export default GuildMembers;