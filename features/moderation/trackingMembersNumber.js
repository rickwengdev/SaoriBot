import axios from 'axios';
import https from 'https';
import Logger from '../../features/errorhandle/errorhandle.js';

/**
 * @class MemberTracker
 * @description Tracks member count and updates a specified channel name accordingly.
 */
class MemberTracker {
  /**
   * @constructor
   * @param {Object} client - Discord.js client instance.
   * @param {string} apiEndpoint - API endpoint URL.
   */
  constructor(client, apiEndpoint) {
    this.client = client;
    this.apiEndpoint = apiEndpoint;
    this.channelCache = new Map();
    this.logger = new Logger();
    this.updateQueue = new Set();
    this.init();
  }

  /**
   * Initializes MemberTracker.
   * Registers event listeners for member updates.
   */
  init() {
    this.logger.info('Initializing MemberTracker...');
    
    this.client.on('guildMemberAdd', (member) => this.safeUpdateChannelName(member.guild.id));
    this.client.on('guildMemberRemove', (member) => this.safeUpdateChannelName(member.guild.id));

    this.logger.info('MemberTracker initialized successfully.');
  }

  /**
   * Ensures channel name updates are not duplicated within a short period.
   * @param {string} guildId - Guild ID.
   */
  safeUpdateChannelName(guildId) {
    if (this.updateQueue.has(guildId)) {
      this.logger.info(`Update already in progress for guild ${guildId}. Skipping...`);
      return;
    }

    this.updateQueue.add(guildId);
    this.updateChannelName(guildId)
      .catch((error) => {
        this.logger.error(`Error updating channel for guild ${guildId}: ${error.message}`);
      })
      .finally(() => {
        this.updateQueue.delete(guildId);
      });
  }

  /**
   * Updates the target voice channel name with the current member count.
   * @param {string} guildId - Guild ID.
   */
  async updateChannelName(guildId) {
    try {
      this.logger.info(`Updating channel name for guild: ${guildId}`);
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) throw new Error(`Guild not found: ${guildId}`);

      const guildMe = guild.members.me || (await guild.members.fetch(this.client.user.id));
      if (!guildMe?.permissions.has('ManageChannels')) {
        throw new Error('Missing permission: ManageChannels');
      }

      const channelId = await this.getChannelId(guildId);
      if (!channelId) throw new Error(`Channel ID not found for guild: ${guildId}`);

      const channel = guild.channels.cache.get(channelId);
      if (!channel || channel.type !== 2) {
        throw new Error('Invalid or missing voice channel');
      }

      await channel.edit({ name: `Members: ${guild.memberCount}` });
      this.logger.info(`Updated channel name for guild ${guildId} to: Members: ${guild.memberCount}`);
    } catch (error) {
      this.logger.error(`Failed to update channel for guild ${guildId}: ${error.message}`);
    }
  }

  /**
   * Retrieves the tracking channel ID from the API.
   * @param {string} guildId - Guild ID.
   * @returns {Promise<string|null>} Channel ID or null.
   */
  async getChannelId(guildId) {
    if (this.channelCache.has(guildId)) {
      return this.channelCache.get(guildId);
    }
  
    try {
      const response = await axios.get(`${this.apiEndpoint}/api/${guildId}/trackingMembers`, {
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      });
  
      const channelId = response.data?.config?.trackingmembers_channel_id || null;
      this.channelCache.set(guildId, channelId);
  
      if (channelId) {
        this.logger.info(`Fetched channel ID for guild ${guildId}: ${channelId}`);
      } else {
        this.logger.warn(`No channel ID found for guild ${guildId}`);
      }
  
      return channelId;
    } catch (error) {
      this.logger.error(`Error fetching channel ID for guild ${guildId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Destroys the tracker by removing event listeners.
   */
  destroy() {
    this.client.off('guildMemberAdd', this.safeUpdateChannelName);
    this.client.off('guildMemberRemove', this.safeUpdateChannelName);
    this.logger.info('MemberTracker destroyed.');
  }
}

export default MemberTracker;
