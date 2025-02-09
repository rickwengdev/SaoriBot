import { PermissionsBitField } from 'discord.js';
import axios from 'axios';
import https from 'https';
import Logger from '../../features/errorhandle/errorhandle.js';

/**
 * @class DynamicVoiceChannelManager
 * @description Manages the creation and deletion of dynamic voice channels.
 */
class DynamicVoiceChannelManager {
    /**
     * Constructor
     * @param {import('discord.js').Client} client - Discord client instance.
     * @param {string} apiEndpoint - API endpoint to fetch trigger channel ID.
     */
    constructor(client, apiEndpoint) {
        this.client = client;
        this.apiEndpoint = apiEndpoint;
        this.logger = new Logger();

        this.init();
    }

    /**
     * Initialize the manager and listen for `voiceStateUpdate` events.
     */
    init() {
        this.client.on('voiceStateUpdate', (oldState, newState) => {
            this.handleVoiceStateUpdate(oldState, newState);
        });
    }

    /**
     * Handle voice state update events.
     * @param {import('discord.js').VoiceState} oldState - Previous voice state.
     * @param {import('discord.js').VoiceState} newState - Updated voice state.
     */
    async handleVoiceStateUpdate(oldState, newState) {
        try {
            const guildId = newState.guild.id;

            // Fetch trigger channel ID
            const triggerChannelId = await this.getTriggerChannelId(guildId);
            if (!triggerChannelId) {
                this.logger.warn(`Guild ${guildId} does not have a configured trigger channel ID.`);
                return;
            }

            // User joined trigger channel
            if (newState.channelId === triggerChannelId) {
                this.logger.info(`User joined trigger channel ${triggerChannelId} in guild ${guildId}.`);
                await this.createDynamicChannel(newState);
            }

            // Check if old channel needs to be deleted
            if (oldState.channel) {
                await this.deleteEmptyChannel(oldState.channel);
            }
        } catch (error) {
            this.logger.error('Error handling voice state update:', error);
        }
    }

    /**
     * Fetch the trigger channel ID from the API.
     * @param {string} guildId - Discord server ID.
     * @returns {Promise<string|null>} Trigger channel ID, or null if not configured.
     */
    async getTriggerChannelId(guildId) {
        try {
            const response = await axios.get(`${this.apiEndpoint}/api/${guildId}/dynamic-voice-channels`, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });
            this.logger.info(`Fetched trigger channel ID for guild ${guildId}: ${response.data?.config.base_channel_id || 'None'}`);
            return response.data?.config.base_channel_id || null;
        } catch (error) {
            this.logger.error(`Error fetching triggerChannelId for guild ${guildId}:`, error);
            return null;
        }
    }

    /**
     * Create a dynamic voice channel and move the user to it.
     * @param {import('discord.js').VoiceState} state - User's voice state.
     */
    async createDynamicChannel(state) {
        const member = state.member;
        if (!member) return;

        // Generate a channel name based on the user's name
        let channelName = member.user.username.trim().replace(/[^a-zA-Z0-9\-_ ]/g, '');
        if (!channelName) channelName = 'Default Channel';

        try {
            const channel = await state.guild.channels.create({
                name: `${channelName}'s Channel`,
                type: 2, // Voice channel
                parent: state.channel.parentId,
                permissionOverwrites: [
                    {
                        id: member.id,
                        allow: [
                            PermissionsBitField.Flags.ManageChannels,
                            PermissionsBitField.Flags.MoveMembers,
                            PermissionsBitField.Flags.MuteMembers,
                            PermissionsBitField.Flags.DeafenMembers,
                        ],
                    },
                ],
            });

            // Move the user to the new channel
            await member.voice.setChannel(channel);
            this.logger.info(`Created and moved user ${member.user.tag} to channel ${channel.id} in guild ${state.guild.id}.`);
        } catch (error) {
            this.logger.error('Failed to create dynamic channel:', error);
        }
    }

    /**
     * Delete an empty dynamic voice channel.
     * @param {import('discord.js').VoiceChannel} channel - The voice channel to check.
     */
    async deleteEmptyChannel(channel) {
        try {
            // Check if channel is empty and dynamically created
            if (channel.members.size === 0 && channel.name.includes("'s Channel")) {
                await channel.delete();
                this.logger.info(`Deleted empty dynamic channel ${channel.id} in guild ${channel.guild.id}.`);
            }
        } catch (error) {
            this.logger.error('Failed to delete empty channel:', error);
        }
    }
}

export default DynamicVoiceChannelManager;