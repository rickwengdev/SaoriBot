import Logger from '../../features/errorhandle/errorhandle.js';

/**
 * @class MessageDeleter
 * @description Provides functionality to delete messages from a Discord channel, including batch deletion.
 */
class MessageDeleter {
    /**
     * @constructor
     * @param {object} interaction - Discord interaction object.
     */
    constructor(interaction) {
        if (!interaction || !interaction.channel) {
            throw new Error('Invalid interaction or channel is not accessible');
        }
        this.interaction = interaction;
        this.channel = interaction.channel;
        this.logger = new Logger();
    }

    /**
     * @method deleteMessages
     * @description Deletes messages based on quantity and time range.
     * @param {number} numberOfMessages - Number of messages to delete (default: 1).
     * @param {boolean} isLargeTimeRange - Whether to delete messages from a larger time range (default: false).
     * @returns {Promise<number>} Number of messages deleted.
     */
    async deleteMessages(numberOfMessages = 1, isLargeTimeRange = false) {
        if (isLargeTimeRange || numberOfMessages > 100) {
            this.logger.info('🔄 Performing multiple batch deletes...');
            return this.bulkDeleteMessages(numberOfMessages);
        }
        return this.simpleDelete(numberOfMessages);
    }

    /**
     * @method simpleDelete
     * @description Deletes messages simply, without exceeding Discord limits (100 messages max).
     * @param {number} numberOfMessages - Number of messages to delete.
     * @returns {Promise<number>} Number of messages deleted.
     */
    async simpleDelete(numberOfMessages) {
        try {
            const deletedMessages = await this.channel.bulkDelete(numberOfMessages, true); // Discord API restricts to messages within 14 days
            this.logger.info(`✅ Successfully deleted ${deletedMessages.size} messages.`);
            return deletedMessages.size;
        } catch (error) {
            this.logger.error('❌ Error in simple delete:', error);
            return 0;
        }
    }

    /**
     * @method bulkDeleteMessages
     * @description Deletes messages in batches, with a maximum of 100 per batch.
     * @param {number} numberOfMessages - Number of messages to delete.
     * @returns {Promise<number>} Number of messages deleted.
     */
    async bulkDeleteMessages(numberOfMessages) {
        let remainingMessages = numberOfMessages;
        const batchSize = 100;
        const delayBetweenBatches = 500; // Milliseconds

        try {
            while (remainingMessages > 0) {
                const messagesToDelete = Math.min(remainingMessages, batchSize);
                const fetchedMessages = await this.channel.messages.fetch({ limit: messagesToDelete });

                this.logger.info(`🗑️ Deleting ${fetchedMessages.size} messages in batch...`);
                await Promise.allSettled(fetchedMessages.map(message => message.delete()));

                remainingMessages -= fetchedMessages.size;

                if (remainingMessages > 0) {
                    this.logger.info(`⏳ Waiting for ${delayBetweenBatches}ms before next batch...`);
                    await this.delay(delayBetweenBatches);
                }
            }
            return numberOfMessages;
        } catch (error) {
            this.logger.error('❌ Error during batch deletion:', error);
            return numberOfMessages - remainingMessages;
        }
    }

    /**
     * @method handleInteraction
     * @description Handles message deletion interaction logic.
     * @param {number} numberOfMessages - Number of messages to delete.
     * @param {boolean} isLargeTimeRange - Whether to delete messages from a larger time range.
     * @returns {Promise<void>}
     */
    async handleInteraction(numberOfMessages = 1, isLargeTimeRange = false) {
        try {
            await this.interaction.deferReply({ ephemeral: true });
            this.logger.info(`Starting to delete ${numberOfMessages} messages (Large time range: ${isLargeTimeRange})`);

            const deletedCount = await this.deleteMessages(numberOfMessages, isLargeTimeRange);
            const replyMessage = deletedCount > 0
                ? `✅ Successfully deleted ${deletedCount} messages.`
                : '⚠️ No messages were deleted.';

            this.logger.info(replyMessage);
            await this.interaction.editReply({ content: replyMessage, ephemeral: true });
        } catch (error) {
            this.handleErrorResponse('❌ Failed to delete messages.', error);
        }
    }

    /**
     * @method handleErrorResponse
     * @description Unified error handling.
     * @param {string} errorMessage - Error message to be logged.
     * @param {Error} error - Error object.
     */
    async handleErrorResponse(errorMessage, error) {
        this.logger.error(errorMessage, error);
        try {
            await this.interaction.editReply({ content: errorMessage, ephemeral: true });
        } catch (replyError) {
            this.logger.error('❌ Error replying to interaction:', replyError);
        }
    }

    /**
     * @method delay
     * @description Adds delay, useful for batch operations.
     * @param {number} ms - Number of milliseconds to delay.
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default MessageDeleter;