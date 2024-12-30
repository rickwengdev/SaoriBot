import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import MessageDeleter from "../../features/moderation/messageDelete.js";

export const data = new SlashCommandBuilder()
    .setName('mod_delete_message')
    .setDescription('Delete message')
    .addIntegerOption(option =>
        option.setName('message_number')
            .setDescription('Number of messages to delete')
            .setRequired(true))
    .addBooleanOption(option =>
        option.setName('reliable_vintage_model')
            .setDescription('Is it the deletion mode for messages older than two weeks or more than 100 messages?'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const messageNumber = interaction.options.getInteger('message_number');
    let timeRangeBig = interaction.options.getBoolean('reliable_vintage_model');

    if (timeRangeBig === null) timeRangeBig = true;

    try {
        // 初始化 MessageDeleter 類並執行刪除邏輯
        const deleter = new MessageDeleter(interaction);
        await deleter.handleInteraction(messageNumber, timeRangeBig);
    } catch (error) {
        console.error("Error executing mod_delete_message command:", error.message);
        await interaction.reply({
            content: "An error occurred while deleting messages.",
            ephemeral: true,
        });
    }
}