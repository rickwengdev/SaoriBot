import mongoose from 'mongoose';

const serverConfigSchema = new mongoose.Schema({
  serverId: { type: String, required: true, unique: true },
  serverName: { type: String },
  settings: {
    autoModeration: { type: Boolean, default: false },
    greetingMessage: { type: String, default: 'Welcome to the server!' },
    welcomeChannel: { type: String, default: null }, // 新增歡迎頻道 ID
    leaveChannel: { type: String, default: null },   // 新增離開頻道 ID
    reactionRoles: {
      type: Object,
      of: new mongoose.Schema({
        emoji: { type: String, required: true },
        role: { type: String, required: true }
      }, { _id: false }) // 不自動生成 _id 字段
    },
    baseVoiceChannel: { type: String, default: null }, // 動態語音頻道的基礎頻道 ID
    logChannel: { type: String, default: null },       // 日誌頻道 ID
  },
});

export default mongoose.model('ServerConfig', serverConfigSchema);