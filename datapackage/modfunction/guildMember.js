import fs from 'fs';
import path from 'path';
import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import ServerConfig from '../../models/ServerConfig.js';

class GuildMembers {
    constructor(client) {
        this.client = client;

        // 綁定事件處理器
        this.registerEvents();
    }

    // 綁定事件
    registerEvents() {
        // 移除已存在的事件監聽器以防止重複綁定
        this.client.removeAllListeners('guildMemberAdd');
        this.client.removeAllListeners('guildMemberRemove');
        
        // 新增 `guildMemberAdd` 事件監聽器
        this.client.on('guildMemberAdd', async (member) => {
            try {
                await this.handleGuildMemberAdd(member);
            } catch (error) {
                console.error('An error occurred in guildMemberAdd event:', error);
            }
        });
        
        // 新增 `guildMemberRemove` 事件監聽器
        this.client.on('guildMemberRemove', async (member) => {
            try {
                await this.handleGuildMemberRemove(member);
            } catch (error) {
                console.error('An error occurred in guildMemberRemove event:', error);
            }
        });
    }

    // 從 MongoDB 查詢伺服器配置
    async fetchGuildConfig(guildId) {
        try {
            // 查找特定伺服器的配置
            const guildConfig = await ServerConfig.findOne({ serverId: guildId });
            if (!guildConfig) {
                console.log(`❕Configuration not found for server ${guildId}.`);
                return null;
            }
            return guildConfig.settings;
        } catch (error) {
            console.error('Error fetching guild configuration from MongoDB:', error);
            return null;
        }
    }

    // 處理成員加入
    async handleGuildMemberAdd(member) {
        const guildConfig = await this.fetchGuildConfig(member.guild.id);

        if (!guildConfig || !guildConfig.welcomeChannel) {
            console.log('❕Welcome channel configuration not found.');
            return;
        }

        const welcomeChannelID = guildConfig.welcomeChannel;
        const welcomeChannel = this.client.channels.cache.get(welcomeChannelID);
        const welcomeBannerPath = path.join(__dirname, 'welcome-banner.png');

        if (!welcomeChannel) {
            console.log('❕Welcome channel not found.');
            return;
        }

        let bannerBuffer;
        try {
            bannerBuffer = await fs.promises.readFile(welcomeBannerPath);
        } catch (error) {
            console.log('Unable to read welcome banner file', error);
        }

        const embed = new EmbedBuilder()
            .setTitle(`Welcome ${member.user.tag} to the server!`)
            .setDescription(`${member.user.toString()} Welcome!`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, format: 'png', size: 256 }));

        const messageOptions = { embeds: [embed] };
        if (bannerBuffer) {
            messageOptions.files = [new AttachmentBuilder(bannerBuffer, 'welcome-banner.png')];
        }

        try {
            await welcomeChannel.send(messageOptions);
        } catch (error) {
            console.error('An error occurred while sending the welcome message or banner:', error);
        }
    }

    // 處理成員離開
    async handleGuildMemberRemove(member) {
        const guildConfig = await this.fetchGuildConfig(member.guild.id);

        if (!guildConfig || !guildConfig.leaveChannel) {
            console.log('❕Leave channel configuration not found.');
            return;
        }

        const leaveChannelID = guildConfig.leaveChannel;
        const leaveChannel = this.client.channels.cache.get(leaveChannelID);

        if (!leaveChannel) {
            console.log('❕Leave channel not found.');
            return;
        }

        try {
            await leaveChannel.send(`**${member.user.tag}** has left the server.`);
        } catch (error) {
            console.error('An error occurred while sending the leave message:', error);
        }
    }
}

export { GuildMembers };