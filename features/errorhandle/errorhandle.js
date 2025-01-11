import winston from 'winston';
import fs from 'fs';
import path from 'path';

/**
 * Logger 日誌管理器，用於記錄應用運行日誌及處理崩潰報告。
 */
class Logger {
  /**
   * 創建 Logger 實例。
   * @param {string} [logDir='logs'] - 日誌文件的存儲目錄（默認為 '../../logs'）。
   */
  constructor(logDir = 'logs') {
    this.logDir = logDir;

    // 創建日誌目錄
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir);
    }

    // 初始化 Logger 實例
    this.logger = winston.createLogger({
      levels: winston.config.npm.levels,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp }) => {
          return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
        })
      ),
      transports: [
        // 終端輸出
        new winston.transports.Console({
          level: 'debug', // 終端顯示 debug 及以上日誌
        }),
        // 文件輸出
        new winston.transports.File({
          filename: path.join(this.logDir, 'app.log'),
          level: 'info', // 文件記錄 info 及以上日誌
        }),
      ],
    });

    // 設置崩潰處理
    this.setupCrashHandlers();
  }

  /**
   * 設置崩潰處理事件監聽器。
   * 捕獲未處理異常和未捕獲的 Promise 拒絕，並生成崩潰報告。
   * @private
   */
  setupCrashHandlers() {
    process.on('uncaughtException', (err) => {
      this.logCrashReport(err);
      console.error('Application crashed! Check crash.log for details.');
      process.exit(1); // 強制退出程式
    });

    process.on('unhandledRejection', (reason) => {
      this.logger.error(`Unhandled Promise Rejection: ${reason}`);
    });
  }

  /**
   * 生成崩潰報告文件。
   * @param {Error} error - 捕獲的異常對象。
   * @private
   */
  logCrashReport(error) {
    const crashLogPath = path.join(this.logDir, 'crash.log');
    const crashLog = `
=== Application Crash Report ===
Timestamp: ${new Date().toISOString()}
Error: ${error.message}
Stack Trace: ${error.stack}
================================
`;
    fs.writeFileSync(crashLogPath, crashLog, 'utf8');
  }

  /**
   * 記錄 debug 級別的日誌信息。
   * @param {string} message - 要記錄的日誌信息。
   */
  debug(message) {
    this.logger.debug(message);
  }

  /**
   * 記錄 info 級別的日誌信息。
   * @param {string} message - 要記錄的日誌信息。
   */
  info(message) {
    this.logger.info(message);
  }

  /**
   * 記錄 warn 級別的日誌信息。
   * @param {string} message - 要記錄的日誌信息。
   */
  warn(message) {
    this.logger.warn(message);
  }

  /**
   * 記錄 error 級別的日誌信息。
   * @param {string} message - 要記錄的日誌信息。
   */
  error(message) {
    this.logger.error(message);
  }
}

export default Logger;