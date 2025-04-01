// main.ts
import { BotClient } from './BotClient';
import { connectToDatabase } from './handlers/mongoose';
import { loadFeatures } from './handlers/feature';
import path from 'path';
import { REST, Routes } from 'discord.js';

(async () => {
  // 1) Initialiser la classe
  const client = await BotClient.init();

  // 2) Connexion à MongoDB
  await connectToDatabase();

  // 3) Charger les fonctionnalités
  const featuresPath = path.join(__dirname, 'features');
  await loadFeatures(client, featuresPath);

  // 4) Connexion à Discord
  try {
    const token = process.env.DISCORD_TOKEN;
    if (!token) throw new Error("DISCORD_TOKEN n'est pas défini dans l'environnement");

    await client.login(token);

    // 5) Auto-déploiement des slash commands (optionnel)
    if (process.env.AUTO_DEPLOY_COMMANDS === 'true') {
      const slashCommands = Array.from(client.slashCommands.values());
      if (slashCommands.length > 0) {
        console.log(`Déploiement de ${slashCommands.length} slash commands...`);
        const rest = new REST({ version: '10' }).setToken(token);
        const commandsData = slashCommands.map(cmd => cmd.data.toJSON());

        if (process.env.GUILD_ID) {
          await rest.put(
            Routes.applicationGuildCommands(client.user?.id || '', process.env.GUILD_ID),
            { body: commandsData }
          );
          console.log("Commandes Slash déployées pour la guild !");
        } else {
          await rest.put(
            Routes.applicationCommands(client.user?.id || ''),
            { body: commandsData }
          );
          console.log("Commandes Slash déployées globalement !");
        }
        console.log('Slash commands enregistrées avec succès!');
      } else {
        console.log("Aucune slash command à déployer.");
      }
    }
  } catch (error) {
    console.error('Erreur lors de la connexion à Discord:', error);
    process.exit(1);
  }
})();
