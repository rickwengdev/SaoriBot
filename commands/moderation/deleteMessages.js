import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import MessageDeleter from "../../features/moderation/messageDelete.js";
import Logger from "../../features/errorhandle/errorhandle.js";

// Initialize Logger instance for logging errors and command execution details
const logger = new Logger();

// Define the slash command
export const data = new SlashCommandBuilder()
    .setName('mod_delete_message')
    .setDescription('Delete message')
    .addIntegerOption(option =>
        option.setName('message_number')
            .setDescription('Number of messages to delete')
            .setRequired(true))
    .addBooleanOption(option =>
        option.setName('reliable_vintage_model')
            .setDescription('Enable deletion mode for messages older than two weeks or exceeding 100 messages?'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

// Command execution function
export async function execute(interaction) {
    // Retrieve command options
    const messageNumber = interaction.options.getInteger('message_number');
    let timeRangeBig = interaction.options.getBoolean('reliable_vintage_model');

    // Default to true if the option is not explicitly provided
    if (timeRangeBig === null) timeRangeBig = true;

    // Log command execution details
    logger.info(`Command /mod_delete_message executed by ${interaction.user.tag} in ${interaction.guild?.name || 'DM'} with options: 
    message_number=${messageNumber}, reliable_vintage_model=${timeRangeBig}`);

    try {
        // Initialize MessageDeleter instance and execute deletion logic
        const deleter = new MessageDeleter(interaction);

        // Log deletion details before execution
        logger.info(`Starting message deletion. Message number: ${messageNumber}, Reliable Vintage Mode: ${timeRangeBig}`);

        await deleter.handleInteraction(messageNumber, timeRangeBig);

        // Log successful deletion
        logger.info(`Successfully deleted ${messageNumber} messages. Mode: ${timeRangeBig ? 'Reliable Vintage' : 'Normal'}`);

        // Send confirmation response to the user
        await interaction.reply({
            content: `${messageNumber} messages deleted successfully.`,
            flags: 64,
        });
    } catch (error) {
        // Log error details
        logger.error(`Error executing /mod_delete_message command by ${interaction.user.tag}:`, error);

        // Notify the user about the failure
        await interaction.reply({
            content: "An error occurred while deleting messages.",
            flags: 64,
        });
    }
}
