/**
 * @class MessageDeleter
 * @description 提供刪除 Discord 頻道消息的功能，包括分批刪除。
 */
class MessageDeleter {
    /**
     * @constructor
     * @param {object} interaction - Discord 的交互對象
     */
    constructor(interaction) {
        if (!interaction || !interaction.channel) {
            throw new Error('Invalid interaction or channel is not accessible');
        }
        this.interaction = interaction;
        this.channel = interaction.channel;
    }

    /**
     * @method deleteMessages
     * @description 根據數量和時間範圍刪除消息。
     * @param {number} numberOfMessages - 要刪除的消息數量 (默認: 1)。
     * @param {boolean} isLargeTimeRange - 是否刪除較大時間範圍內的消息 (默認: false)。
     * @returns {Promise<number>} 刪除的消息數量。
     */
    async deleteMessages(numberOfMessages = 1, isLargeTimeRange = false) {
        if (isLargeTimeRange || numberOfMessages > 100) {
            console.log('🔄 Performing multiple batch deletes...');
            return this.bulkDeleteMessages(numberOfMessages);
        }
        return this.simpleDelete(numberOfMessages);
    }

    /**
     * @method simpleDelete
     * @description 簡單刪除消息，不超過 Discord 限制（100 條）。
     * @param {number} numberOfMessages - 要刪除的消息數量。
     * @returns {Promise<number>} 刪除的消息數量。
     */
    async simpleDelete(numberOfMessages) {
        try {
            const deletedMessages = await this.channel.bulkDelete(numberOfMessages, true); // Discord API 限制最多 14 天內消息
            console.log(`✅ Successfully deleted ${deletedMessages.size} messages.`);
            return deletedMessages.size;
        } catch (error) {
            console.error('❌ Error in simple delete:', error.message);
            return 0;
        }
    }

    /**
     * @method bulkDeleteMessages
     * @description 分批刪除消息，每批最多 100 條。
     * @param {number} numberOfMessages - 要刪除的消息數量。
     * @returns {Promise<number>} 刪除的消息數量。
     */
    async bulkDeleteMessages(numberOfMessages) {
        let remainingMessages = numberOfMessages;
        const batchSize = 100;
        const delayBetweenBatches = 500; // 毫秒

        try {
            while (remainingMessages > 0) {
                const messagesToDelete = Math.min(remainingMessages, batchSize);
                const fetchedMessages = await this.channel.messages.fetch({ limit: messagesToDelete });

                console.log(`🗑️ Deleting ${fetchedMessages.size} messages in batch...`);
                await Promise.allSettled(fetchedMessages.map(message => message.delete()));

                remainingMessages -= fetchedMessages.size;

                if (remainingMessages > 0) {
                    console.log(`⏳ Waiting for ${delayBetweenBatches}ms before next batch...`);
                    await this.delay(delayBetweenBatches);
                }
            }
            return numberOfMessages;
        } catch (error) {
            console.error('❌ Error during batch deletion:', error.message);
            return numberOfMessages - remainingMessages;
        }
    }

    /**
     * @method shouldAbort
     * @description 判斷是否應該中止交互。
     * @returns {boolean} 是否應中止交互。
     */
    shouldAbort() {
        return this.interaction.deferred || this.interaction.replied || !this.interaction.isCommand();
    }

    /**
     * @method handleInteraction
     * @description 處理消息刪除的交互邏輯。
     * @param {number} numberOfMessages - 要刪除的消息數量。
     * @param {boolean} isLargeTimeRange - 是否刪除較大時間範圍內的消息。
     * @returns {Promise<void>}
     */
    async handleInteraction(numberOfMessages = 1, isLargeTimeRange = false) {
        if (this.shouldAbort()) {
            console.error('❌ Interaction aborted:', this.interaction);
            return;
        }

        try {
            await this.interaction.deferReply({ ephemeral: true });
            const deletedCount = await this.deleteMessages(numberOfMessages, isLargeTimeRange);

            const replyMessage = deletedCount > 0
                ? `✅ Successfully deleted ${deletedCount} messages.`
                : '⚠️ No messages were deleted.';
            await this.interaction.editReply({ content: replyMessage, ephemeral: true });
        } catch (error) {
            this.handleErrorResponse('❌ Failed to delete messages.', error);
        }
    }

    /**
     * @method handleErrorResponse
     * @description 統一異常處理。
     * @param {string} errorMessage - 錯誤消息。
     * @param {Error} error - 錯誤對象。
     */
    async handleErrorResponse(errorMessage, error) {
        console.error(errorMessage, error);
        try {
            await this.interaction.editReply({ content: errorMessage, ephemeral: true });
        } catch (replyError) {
            console.error('❌ Error replying to interaction:', replyError.message);
        }
    }

    /**
     * @method delay
     * @description 增加延遲，適用於批次操作。
     * @param {number} ms - 延遲的毫秒數。
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default MessageDeleter;