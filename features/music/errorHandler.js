/**
 * 統一錯誤處理。
 * @param {Error} error - 錯誤對象。
 * @param {import('discord.js').CommandInteraction} interaction - Discord 交互對象。
 * @param {string} errorMessage - 錯誤消息。
 */
export const errorhandler = async (error, interaction, errorMessage) => {
    console.error(errorMessage, error);
    if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: "An error occurred: " + errorMessage });
    } else {
        await interaction.reply({ content: "An error occurred: " + errorMessage, ephemeral: true });
    }
};