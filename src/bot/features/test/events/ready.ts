import { Client, REST, Routes } from 'discord.js';

export default {
  name: 'ready',
  once: true,
  
  /**
   * Gère l'événement ready du bot
   * @param client Le client Discord
   */
  async execute(client: Client) {
    console.log(`Bot prêt! Connecté en tant que ${client.user?.tag}`);
    
    // Enregistrement des slash commands
    try {
      const slashCommands = Array.from(client.slashCommands.values());
      
      if (slashCommands.length > 0) {
        console.log(`Enregistrement de ${slashCommands.length} slash commands...`);
        
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN || '');
        const commandsData = slashCommands.map(command => command.data.toJSON());

        if (process.env.GUILD_ID) {
          await rest.put(
            Routes.applicationGuildCommands(client.user?.id || '', process.env.GUILD_ID!),
            { body: commandsData }
          );
          console.log("Commandes Slash déployées (Guild) !");
        } else {
          await rest.put(
            Routes.applicationCommands(client.user?.id || ''),
            { body: commandsData }
          );
          console.log("Commandes Slash déployées (Global) !");
        }
        
        console.log('Slash commands enregistrées avec succès!');
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des slash commands:', error);
    }
  }
};