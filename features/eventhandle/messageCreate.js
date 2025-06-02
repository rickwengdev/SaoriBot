import { Events } from 'discord.js';
import Logger from '../errorhandle/errorhandle.js';
import { handleDirectMessage } from '../AIChat/geminiCore.js';


const logger = new Logger();

export const name = Events.MessageCreate;

/**
 * 處理來自使用者的私訊，並交給 geminiCore 處理
 * @param {import('discord.js').Message} message
 */
export const execute = async (message) => {
    if (message.author.bot) return; // 忽略 bot
    if (!message.guild) {
        logger.info(`📩 收到私訊來自 ${message.author.tag}：${message.content}`);
        logger.debug(`message.channel.type: ${message.channel.type}`);

        try {
            await handleDirectMessage(message); // 將私訊交給 geminiCore 處理
        } catch (error) {
            logger.error(`❌ 無法處理私訊：${error.message}`);
            await message.reply("❌ 發生錯誤，請稍後再試。");
        }
    }
};
