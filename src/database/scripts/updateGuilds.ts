import GuildModel from '../models/Guild';

export async function updateGuilds() {
  try {
    const result = await GuildModel.updateMany(
      { 'features.leveling': { $exists: false } },
      {
        $set: {
          'features.leveling': {
            enabled: true,
            taux: 1
          }
        }
      }
    );
    
    console.log(`Mise à jour réussie : ${result.modifiedCount} guildes ont été mises à jour`);
  } catch (error) {
    console.error('Erreur lors de la mise à jour des guildes:', error);
  }
}