import { SlashCommandBuilder } from 'discord.js';
import Logger from '../../features/errorhandle/errorhandle.js';

// Initialize Logger instance
const logger = new Logger();

export const data = new SlashCommandBuilder()
  .setName('bot_anonymousmessage')
  .setDescription('Anonymous messages/endorsements')
  .addStringOption(option => 
    option.setName('message')
    .setDescription('Anonymous message to send')
    .setRequired(true))
  .addStringOption(option => 
    option.setName('messageid')
    .setDescription('Message ID to reply to'));

export async function execute(interaction) {
  const message = interaction.options.getString('message');
  const messageId = interaction.options.getString('messageid');
  const userTag = interaction.user.tag;
  const guildId = interaction.guild?.id;

  try {
    logger.info(`Command /bot_anonymousmessage triggered by ${userTag} in guild ${guildId || 'DM'} with message: "${message}"`);

    if (messageId) {
      logger.info(`Anonymous message is a reply to message ID: ${messageId}`);
      // Send reply message
      await interaction.reply({
        content: `Anonymous message sent: "${message}", reply to: ${messageId}`,
        ephemeral: true,
      });
      await interaction.channel.send({
        content: message,
        reply: { messageReference: messageId },
      });
      logger.info(`Anonymous reply sent successfully in guild ${guildId || 'DM'}`);
    } else {
      // Send a regular anonymous message
      await interaction.reply({
        content: `Anonymous message sent: "${message}"`,
        ephemeral: true,
      });
      await interaction.channel.send(message);
      logger.info(`Anonymous message sent successfully in guild ${guildId || 'DM'}`);
    }
  } catch (error) {
    logger.error(`Failed to send anonymous message in guild ${guildId || 'DM'}: ${error.message}`);
    await interaction.reply({
      content: 'Failed to send anonymous message. Please try again later.',
      ephemeral: true,
    });
  }
}
