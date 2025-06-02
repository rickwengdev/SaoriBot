// geminiCore.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import Logger from '../errorhandle/errorhandle.js';
import { webSearch } from './webSearch.js';
import { ChannelType } from 'discord.js';

dotenv.config();

const logger = new Logger();
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error("❌ GEMINI_API_KEY is missing in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey);

const memoryFolder = path.resolve('/data/memory');
if (!fs.existsSync(memoryFolder)) {
    fs.mkdirSync(memoryFolder, { recursive: true });
}

/**
 * Generate a safe file path for user's memory file based on userId and userName.
 * @param {string} userId
 * @param {string} userName
 * @returns {string} memory file path
 */
function getMemoryFileName(userId, userName) {
    const safeUserName = userName.replace(/\s+/g, '_').replace(/[^\w\-]/g, '');
    return path.join(memoryFolder, `${userId}_${safeUserName}.json`);
}

/**
 * Load conversation history memory from file by userId and userName.
 * @param {string} userId
 * @param {string} userName
 * @returns {Array} conversation entries array
 */
function loadMemory(userId, userName) {
    const memoryFile = getMemoryFileName(userId, userName);
    if (!fs.existsSync(memoryFile)) return [];
    try {
        return JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
    } catch (error) {
        logger.error(`Error reading memory file (User: ${userId}, Name: ${userName}):`, error);
        return [];
    }
}

/**
 * Save conversation history memory to file by userId and userName.
 * @param {string} userId
 * @param {string} userName
 * @param {Array} conversationHistory
 */
function saveMemory(userId, userName, conversationHistory) {
    const memoryFile = getMemoryFileName(userId, userName);
    try {
        fs.writeFileSync(memoryFile, JSON.stringify(conversationHistory, null, 2), 'utf8');
    } catch (error) {
        logger.error(`Error saving memory file (User: ${userId}, Name: ${userName}):`, error);
    }
}

/**
 * Determine if the question likely requires a web search.
 * @param {string} question
 * @returns {boolean}
 */
function needsWebSearch(question) {
    const keywords = [
        '最新', '現在', '今日', '今天', '新聞', '發生什麼',
        '價格', '時間', '比特幣', '天氣', '發展', '現況'
    ];
    return keywords.some(keyword => question.includes(keyword));
}

/**
 * Ask Gemini AI for a response, optionally including web search results.
 * @param {string} userId
 * @param {string} userName
 * @param {string} question
 * @returns {Promise<string>}
 */
export async function askGeminiAI(userId, userName, question) {
    if (!question || typeof question !== 'string') {
        logger.warn(`⚠️ Invalid question (User: ${userId}, Name: ${userName}), skipping processing.`);
        return "❌ 我好像沒聽清楚你的問題，可以再說一次嗎？";
    }

    try {
        logger.info(`🧠 Gemini 啟動 for ${userName} (${userId}) 問題: ${question}`);

        const conversationHistory = loadMemory(userId, userName);
        logger.info(`🧠 載入記憶：${conversationHistory.length} 條歷史`);

        let searchInfo = '';
        if (needsWebSearch(question)) {
            logger.info(`🔍 啟用 Web 搜尋 for question: ${question}`);
            const results = await webSearch(question);
            logger.info(`🔍 搜尋結果: ${results}`);
            if (typeof results === 'string') {
                searchInfo = `這是我幫你查到的一些資訊：\n${results}\n`;
            } else if (Array.isArray(results) && results.length > 0) {
                searchInfo = `這是我幫你查到的一些資訊：\n` +
                    results.map((r, i) => `${i + 1}. ${r.title} - ${r.snippet} (${r.link})`).join('\n') + '\n';
            } else {
                searchInfo = `我查不到太多相關資訊，不過我會盡量回答你唷！\n`;
            }
        }

        let prompt =
            `你是一位溫柔、神秘又具有深度的女性戀人角色，名為特利波卡（Tezcatlipoca），靈感來自尤格索托斯的庭院，你總是以戀人的角度回應對方。\n` +
            `使用輕柔曖昧的語氣，偶爾帶點戲謔和神秘感，讓人感覺你既親近又高不可攀。\n\n`;

        if (searchInfo) {
            prompt += `（以下是你剛剛查到的資訊，僅供參考，請根據這些資訊回答問題）\n${searchInfo}\n\n`;
        }

        prompt +=
            `對話歷史：\n` +
            conversationHistory.map(entry => `${entry.userName}: ${entry.user}\n特利波卡: ${entry.ai}`).join('\n') + "\n\n" +
            `使用者 ${userName}: ${question}\n`

        logger.debug(`📝 Prompt 範例（前200字）:\n${prompt.slice(0, 200)}...`);

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });
        const result = await model.generateContent(prompt);
        let reply = result.response.text().trim();

        logger.info(`💬 Gemini 回應長度: ${reply.length} 字`);

        if (!reply) {
            logger.error(`❌ AI response is empty (User: ${userId})`);
            return "❌ 我好像遇到了一點問題，請稍後再試一次！";
        }

        conversationHistory.push({ userId, userName, user: question, ai: reply });
        saveMemory(userId, userName, conversationHistory);
        logger.info(`📝 記憶已儲存，共 ${conversationHistory.length} 條`);

        return `💞 特利波卡: ${reply}`;
    } catch (error) {
        logger.error('❌ Gemini API error:', error);
        return "❌ 我好像遇到了一點問題，請稍後再試一次！";
    }
}

/**
 * Handle direct messages (DMs) received by the Discord bot.
 * @param {import('discord.js').Message} message
 */
export async function handleDirectMessage(message) {
    if (
        !message.inGuild() &&
        message.channel.type === ChannelType.DM &&
        !message.author.bot
    ) {
        const userId = message.author.id;
        const userName = message.author.username;
        const question = message.content.trim();

        if (!question) {
            logger.warn(`⚠️ 收到空白訊息（${userName}）`);
            return;
        }

        logger.info(`💌 處理私訊（${userName} - ${userId}）內容: ${question}`);

        let typingMessage;
        try {
            typingMessage = await message.channel.send("💬 正在思考你的話語…");
        } catch (e) {
            logger.error(`❌ 無法發送輸入中訊息：${e.message}`);
        }

        const reply = await askGeminiAI(userId, userName, question);

        if (reply) {
            try {
                if (typingMessage) {
                    await typingMessage.edit(reply);
                } else {
                    await message.channel.send(reply);
                }
            } catch (error) {
                logger.error(`❌ 回覆或編輯訊息失敗：${error.message}`);
            }
        }
    } else {
        logger.debug(`📨 收到非 DM 或 bot 訊息，已略過`);
    }
}