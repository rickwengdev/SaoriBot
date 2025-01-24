import axios from 'axios';
import https from 'https';
import Logger from '../../features/errorhandle/errorhandle.js';

class MemberTracker {
  /**
   * 构造函数
   * @param {Object} client - Discord.js 客户端实例
   * @param {string} apiEndpoint - API 端点 URL
   */
  constructor(client, apiEndpoint) {
    this.client = client;
    this.apiEndpoint = apiEndpoint;
    this.channelCache = new Map();
    this.logger = new Logger();
    this.updateQueue = new Set(); // 防止重复更新
    this.init();
  }

  /**
   * 初始化 MemberTracker
   * 注册事件监听器并更新所有频道
   */
  async init() {
    try {
      this.logger.info('Initializing MemberTracker...');

      // 注册事件监听器
      this.client.on('guildMemberAdd', (member) => {
        this.safeUpdateChannelName(member.guild.id);
      });

      this.client.on('guildMemberRemove', (member) => {
        this.safeUpdateChannelName(member.guild.id);
      });

      this.logger.info('MemberTracker initialized successfully.');
    } catch (error) {
      this.logger.error(`Error during MemberTracker initialization: ${error.message}\n${error.stack}`);
    }
  }

  /**
   * 安全更新频道名称
   * 避免短时间内重复更新
   * @param {string} guildId - 服务器 ID
   */
  safeUpdateChannelName(guildId) {
    if (this.updateQueue.has(guildId)) {
      this.logger.info(`Update already in progress for guild ${guildId}. Skipping...`);
      return;
    }

    this.updateQueue.add(guildId);
    this.updateChannelName(guildId)
      .catch((error) => {
        this.logger.error(`Error during safe channel update for guild ${guildId}: ${error.message}`);
      })
      .finally(() => {
        this.updateQueue.delete(guildId);
      });
  }

  /**
   * 更新指定服务器的频道名称
   * @param {string} guildId - 服务器 ID
   */
  async updateChannelName(guildId) {
    try {
      this.logger.info(`Updating channel name for guild: ${guildId}`);
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) throw new Error(`Guild not found: ${guildId}`);

      // 获取 bot 的成员对象
      const guildMe = guild.me || (await guild.members.fetch(this.client.user.id));
      if (!guildMe) {
        throw new Error(`Failed to fetch bot's member object in guild: ${guildId}`);
      }

      // 检查权限
      if (!guildMe.permissions.has('MANAGE_CHANNELS')) {
        throw new Error('Missing permission: MANAGE_CHANNELS');
      }

      const channelId = await this.getChannelId(guildId);
      if (!channelId) throw new Error(`Channel ID not found for guild: ${guildId}`);

      const channel = guild.channels.cache.get(channelId);
      if (!channel || channel.type !== 2) {
        throw new Error('Voice channel not found or invalid type');
      }

      const memberCount = guild.memberCount;
      await channel.edit({ name: `伺服器人數: ${memberCount}`, userLimit: 0 });
      this.logger.info(`Successfully updated channel name for guild ${guildId} to: 伺服器人數: ${memberCount}`);
    } catch (error) {
      this.logger.error(`Failed to update channel name for guild ${guildId}: ${error.message}\n${error.stack}`);
    }
  }

  /**
   * 获取指定服务器的目标频道 ID
   * @param {string} guildId - 服务器 ID
   * @returns {Promise<string|null>} 频道 ID 或 null
   */
  async getChannelId(guildId) {
    if (this.channelCache.has(guildId)) {
      return this.channelCache.get(guildId);
    }
  
    try {
      const response = await axios.get(`${this.apiEndpoint}/api/${guildId}/trackingMembers`, {
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      });
  
      // 修正字段名为 trackingmembers_channel_id
      const channelId = response.data?.config?.trackingmembers_channel_id || null;
      this.channelCache.set(guildId, channelId);
  
      if (channelId) {
        this.logger.info(`Fetched channel ID for guild ${guildId}: ${channelId}`);
      } else {
        this.logger.warn(`No channel ID found for guild ${guildId}`);
      }
  
      return channelId;
    } catch (error) {
      this.logger.error(`Error fetching channel ID for guild ${guildId}: ${error.message}\nResponse Data: ${JSON.stringify(error.response?.data)}`);
      return null;
    }
  }

  /**
   * 销毁 MemberTracker
   * 移除事件监听器
   */
  destroy() {
    this.client.off('guildMemberAdd', this.safeUpdateChannelName);
    this.client.off('guildMemberRemove', this.safeUpdateChannelName);
    this.logger.info('MemberTracker destroyed.');
  }
}

export default MemberTracker;