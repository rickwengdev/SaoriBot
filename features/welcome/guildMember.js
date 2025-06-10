import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import axios from 'axios';
import https from 'https';
import Logger from '../../features/errorhandle/errorhandle.js'; // Assume Logger is located here

/**
 * @class GuildMembers
 * @description Handles member join and leave events, sending welcome or leave messages.
 */
class GuildMembers {
    /**
     * @constructor
     * @param {import('discord.js').Client} client - Discord client instance.
     * @param {string} apiEndpoint - API endpoint to fetch welcome and leave channel configurations.
     */
    constructor(client, apiEndpoint) {
        this.client = client;
        this.apiEndpoint = apiEndpoint;
        this.logger = new Logger();

        // Register event handlers
        this.registerEvents();
    }

    /**
     * Registers event listeners.
     */
    registerEvents() {
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
     * Fetches guild configuration from the API.
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
     * Handles member join events.
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
            .setColor('#FFC0CB') // Pink
            .setTitle(`⭐ Welcome ${member.user.tag}! ⭐`)
            .setDescription(
                `✨ welcome to ${member.guild.name} ✨\n\n` +
                `This is a place full of possibilities and learning opportunities!\n\n` +
                `🌟 We hope you find what you're looking for here! 🌟`
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, format: 'png', size: 256 }))
            .setImage('attachment://welcome-banner.png');

        const messageOptions = { 
            embeds: [embed],
        };

        if (bannerBuffer) {
            messageOptions.files = [new AttachmentBuilder(bannerBuffer, { name: 'welcome-banner.png' })];
        }
    
        try {
            await welcomeChannel.send(messageOptions);
            this.logger.info(`Welcome message sent for member ${member.user.tag} in guild ${member.guild.id}`);
        } catch (error) {
            this.logger.error(`Error sending welcome message for member ${member.user.tag} in guild ${member.guild.id}:`, error);
        }
    }

    /**
     * Handles member leave events.
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
