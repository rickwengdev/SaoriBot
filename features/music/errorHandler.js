/**
 * Unified error handling function.
 * @param {Error} error - The error object.
 * @param {import('discord.js').CommandInteraction} interaction - The Discord interaction object.
 * @param {string} errorMessage - Custom error message.
 */
export const errorhandler = async (error, interaction, errorMessage) => {
    console.error(errorMessage, error);
    
    if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: `An error occurred: ${errorMessage}` });
    } else {
        await interaction.reply({ content: `An error occurred: ${errorMessage}`, ephemeral: true });
    }
};