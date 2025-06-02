import winston from 'winston';
import fs from 'fs';
import path from 'path';

/**
 * Logger class for managing application logs and handling crash reports.
 */
class Logger {
  /**
   * Create a Logger instance.
   * @param {string} [logDir='logs'] - Directory to store log files (default: 'logs').
   */
  constructor(logDir = 'logs') {
    this.logDir = logDir;
    this.logDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Create log directory if it does not exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir);
    }

    // Initialize Winston logger with daily rotating logs
    this.logger = winston.createLogger({
      levels: winston.config.npm.levels,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp, stack }) => {
          return stack
            ? `[${timestamp}] [${level.toUpperCase()}]: ${message}\n${stack}`
            : `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
        })
      ),
      transports: [
        // Console output
        new winston.transports.Console({
          level: 'debug', // Display debug level and above logs in console
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        // File output with daily log rotation
        new winston.transports.File({
          filename: path.join(this.logDir, `app-${this.logDate}.log`),
          level: 'info', // Store info level and above logs in file
        }),
      ],
    });

    // Set up crash handlers
    this.setupCrashHandlers();
  }

  /**
   * Set up crash event handlers.
   * Captures uncaught exceptions and unhandled promise rejections, logging crash reports.
   * @private
   */
  setupCrashHandlers() {
    process.on('uncaughtException', (err) => {
      this.logCrashReport(err);
      console.error('Application crashed! Check crash log for details.', err);
      process.exit(1); // Force exit the process
    });

    process.on('unhandledRejection', (reason) => {
      this.logger.error(`Unhandled Promise Rejection:`, reason);
    });
  }

  /**
   * Generate a crash report file with a timestamped filename.
   * @param {Error} error - The captured exception.
   * @private
   */
  logCrashReport(error) {
    const crashLogPath = path.join(this.logDir, `crash-${this.logDate}.log`);
    const crashLog = `
=== Application Crash Report ===
Timestamp: ${new Date().toISOString()}
Error: ${error.message}
Stack Trace: ${error.stack}
================================
`;
    fs.appendFileSync(crashLogPath, crashLog, 'utf8');
  }

  /**
   * Log a debug level message.
   * @param {string} message - Message to log.
   */
  debug(message) {
    this.logger.debug(message);
  }

  /**
   * Log an info level message.
   * @param {string} message - Message to log.
   */
  info(message) {
    this.logger.info(message);
  }

  /**
   * Log a warning level message.
   * @param {string} message - Message to log.
   */
  warn(message) {
    this.logger.warn(message);
  }

  /**
   * Log an error level message, handling error objects properly.
   * @param {string|Error} error - Message or error object to log.
   */
  error(error) {
    if (error instanceof Error) {
      const stack = error.stack ? `\n${error.stack}` : '';
      this.logger.error(`${error.message}${stack}`);
    } else {
      this.logger.error(error);
    }
  }
}

export default Logger;