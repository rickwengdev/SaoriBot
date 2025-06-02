import axios from 'axios';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';  // 假設你有這個AI物件
import Logger from '../errorhandle/errorhandle.js';

dotenv.config();

const logger = new Logger();

const API_KEY = process.env.GOOGLE_CSE_API_KEY;
const CX = process.env.GOOGLE_CSE_CX;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY || !CX) {
  throw new Error("❌ 缺少 GOOGLE_CSE_API_KEY 或 GOOGLE_CSE_CX 環境變數");
}
if (!GEMINI_API_KEY) {
  throw new Error("❌ 缺少 GEMINI_API_KEY 環境變數");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * 進行 Google CSE 搜尋以獲取即時資訊
 * @param {string} query - 使用者輸入的搜尋關鍵字
 * @param {number} num - 回傳結果數量（預設為5）
 * @returns {Promise<Array<{ title: string, snippet: string, link: string }>>}
 */
async function rawWebSearch(query, num = 5) {
  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: API_KEY,
        cx: CX,
        q: query,
        num,
      },
    });

    if (!response.data.items) return [];

    return response.data.items.map(item => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link,
    }));
  } catch (error) {
    logger.error("❌ WebSearch 原始搜尋錯誤：" + error.message);
    return [];
  }
}

/**
 * 用 AI 過濾搜尋結果，挑出最符合問題的結果摘要
 * @param {string} question - 使用者提問
 * @param {Array} results - 原始搜尋結果陣列
 * @returns {Promise<string>} - AI 篩選後的結果摘要字串
 */
async function filterResultsByAI(question, results) {
  if (results.length === 0) return "抱歉，我找不到相關資訊。";

  // 將搜尋結果格式化成字串，方便AI理解
  const resultsText = results
    .map((r, i) => `${i + 1}. 標題：${r.title}\n摘要：${r.snippet}\n網址：${r.link}`)
    .join('\n\n');

  const prompt = `
你是一個專業的資訊篩選助手，請根據使用者的問題，從以下搜尋結果中挑選出最相關的資訊，並以簡潔且明確的文字回覆。不要重複無關內容。

使用者問題：
${question}

搜尋結果：
${resultsText}

請給我一段精簡且有用的摘要回答：
`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });
    const result = await model.generateContent(prompt);
    const filteredReply = result.response.text().trim();

    if (!filteredReply) {
      logger.warn("⚠️ AI 過濾結果為空");
      return "抱歉，我無法根據搜尋結果產生有用回應。";
    }
    return filteredReply;
  } catch (error) {
    logger.error("❌ AI 過濾錯誤：" + error.message);
    return "抱歉，篩選資訊時發生錯誤。";
  }
}

/**
 * 結合 Google CSE 搜尋與 AI 篩選
 * @param {string} query - 使用者搜尋問題
 * @param {number} num - 要抓取的搜尋結果數量
 * @returns {Promise<string>} - 篩選後的回覆文字
 */
export async function webSearch(query, num = 5) {
  const rawResults = await rawWebSearch(query, num);
  const filteredResult = await filterResultsByAI(query, rawResults);
  return filteredResult;
}