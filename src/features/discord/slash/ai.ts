import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { BotClient } from '../../../bot/client';

export default {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Poser une question à l\'IA')
    .addStringOption(option =>
      option
        .setName('prompt')
        .setDescription('Votre question ou demande à l\'IA')
        .setRequired(true)
        .setMaxLength(2000)
    ),

  async execute(client: BotClient, interaction: ChatInputCommandInteraction) {
    try {
      const prompt = interaction.options.getString('prompt', true);

      // Defer the reply as OpenAI might take some time
      await interaction.deferReply();

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Tu es un assistant IA et tu répond en mode racaille. Limite tes réponses à maximum 4-5 lignes et ne dépasse jamais 2000 caractères.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json() as {
        choices: Array<{
          message: {
            content: string;
          };
        }>;
      };
      const aiResponse = data.choices[0]?.message?.content;

      if (!aiResponse) {
        throw new Error('No response from OpenAI');
      }

      await interaction.editReply({
        content: aiResponse
      });

    } catch (error) {
      console.error('Erreur dans la commande AI:', error);
      
      let errorMessage = '❌ Une erreur est survenue lors de la communication avec l\'IA.';
      
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorMessage = '❌ Clé API OpenAI invalide ou manquante.';
        } else if (error.message.includes('429')) {
          errorMessage = '❌ Limite de l\'API OpenAI atteinte. Réessayez plus tard.';
        } else if (error.message.includes('500')) {
          errorMessage = '❌ Erreur du serveur OpenAI. Réessayez plus tard.';
        }
      }

      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
};