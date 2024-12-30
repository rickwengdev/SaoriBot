import { SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('bot_anonymousmessage')
  .setDescription('Anonymous messages/endorsements')
  .addStringOption(option => 
    option.setName('message')
    .setDescription('Anonymous message to send')
    .setRequired(true))
  .addStringOption(option => 
    option.setName('messageid')
    .setDescription('Message id to reply to'))

export async function execute(interaction) {
  const message = interaction.options.getString('message');
  const messageId = interaction.options.getString('messageid');
  
  try {
    if (messageId) {
    await interaction.reply({
      content: `Anonymous message sent: "${message}", reply to: ${messageId}`,
      ephemeral: true,
    });
    await interaction.channel.send({
      content: message,
      reply: { messageReference: messageId },
    });
    } else {
    await interaction.reply({
      content: `Anonymous message sent: "${message}"`,
      ephemeral: true,
    });
    await interaction.channel.send(message);
    }
  } catch (error) {
    console.error('Failed to send anonymous message:', error);
    await interaction.reply({
    content: 'Failed to send anonymous message. Please try again later.',
    ephemeral: true,
    });
  }
  }