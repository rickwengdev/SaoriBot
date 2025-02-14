import axios from 'axios';
import https from 'https';
import Logger from '../../features/errorhandle/errorhandle.js';

/**
 * @class MemberTracker
 * @description Tracks member count and updates a specified channel name at scheduled intervals.
 */
class MemberTracker {
  /**
   * @constructor
   * @param {Object} client - Discord.js client instance.
   * @param {string} apiEndpoint - API endpoint URL.
   * @param {number} interval - Update interval in milliseconds.
   */
  constructor(client, apiEndpoint, interval = 60000) {
    this.client = client;
    this.apiEndpoint = apiEndpoint;
    this.channelCache = new Map();
    this.logger = new Logger();
    this.interval = interval;
    this.trackerInterval = null;
    this.init();
  }

  /**
   * Initializes MemberTracker and starts the scheduled updates.
   */
  init() {
    this.logger.info('Initializing MemberTracker with scheduled updates...');
    this.startTracking();
  }

  /**
   * Starts the scheduled member count updates.
   */
  startTracking() {
    if (this.trackerInterval) {
      clearInterval(this.trackerInterval);
    }
    
    this.trackerInterval = setInterval(() => {
      this.client.guilds.cache.forEach(guild => {
        this.updateChannelName(guild.id);
      });
    }, this.interval);

    this.logger.info(`Member tracking started, updating every ${this.interval / 1000} seconds.`);
  }

  /**
   * Stops the scheduled updates.
   */
  stopTracking() {
    if (this.trackerInterval) {
      clearInterval(this.trackerInterval);
      this.trackerInterval = null;
      this.logger.info('Member tracking stopped.');
    }
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
   * Destroys the tracker by stopping updates.
   */
  destroy() {
    this.stopTracking();
    this.logger.info('MemberTracker destroyed.');
  }
}

export default MemberTracker;
