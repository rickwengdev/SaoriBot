import { PermissionsBitField } from 'discord.js';
import ServerConfig from '../../models/ServerConfig.js';

async function dynamicvoicechannel(client) {
    // 監聽用戶加入或離開語音頻道
    client.on('voiceStateUpdate', async (oldState, newState) => {
        const guildId = newState.guild.id;
        
        // 從 MongoDB 中查詢伺服器的配置
        const serverConfig = await ServerConfig.findOne({ serverId: guildId });
        if (!serverConfig) return; // 如果伺服器配置不存在，直接返回

        const triggerChannelId = serverConfig.settings.baseVoiceChannel;

        // 檢查是否有成員加入了語音頻道
        if (triggerChannelId && newState.channelId === triggerChannelId) {
            const member = newState.member;
            let channelName = member.user.username.trim().replace(/[^a-zA-Z0-9\-_ ]/g, "");
            if (!channelName) channelName = 'Default Channel';

            try {
                // 創建新的語音頻道
                const channel = await newState.guild.channels.create({
                    name: `${channelName}'s Channel`,
                    type: 2, // 2 = voice channel
                    parent: newState.channel.parentId,
                    permissionOverwrites: [{
                        id: member.id,
                        allow: [
                            PermissionsBitField.Flags.ManageChannels,
                            PermissionsBitField.Flags.MoveMembers,
                            PermissionsBitField.Flags.MuteMembers,
                            PermissionsBitField.Flags.DeafenMembers
                        ]
                    }]
                });

                await member.voice.setChannel(channel); // 移動成員到新的語音頻道

                console.log(`Created and moved member to channel: ${channel.id}`);

            } catch (error) {
                console.error('Failed to create the channel:', error);
            }
        }

        // 檢查是否有成員離開了語音頻道
        if (oldState.channel) {
            console.log('oldState.channel:', oldState.channel.id, oldState.channel.name);
            if (oldState.channel.members.size === 0) {
                if (oldState.channel.name.includes("'s Channel")) {
                    try {
                        // 刪除空的語音頻道
                        await oldState.channel.delete();
                        console.log(`Deleted channel ${oldState.channel.id}`);
                    } catch (error) {
                        console.error('Failed to delete the channel:', error);
                    }
                }
            }
        } else {
            console.log('oldState.channel is null or undefined');
        }
    });
}

export {
    dynamicvoicechannel,
};