import GuildUserModel from '../src/features/user/models/guild-user.model';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Test de la fonction splitSessionIntoDailySegments (copie pour tester)
function normalizeDate(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0, 0, 0, 0
  );
}

function splitSessionIntoDailySegments(start: Date, end: Date, expectedTotalSeconds: number): Array<{date: Date, seconds: number}> {
  const segments: Array<{date: Date, seconds: number}> = [];

  let cursor = new Date(start);
  while (cursor < end) {
    const dayStart = normalizeDate(cursor);
    const nextDayStart = new Date(dayStart);
    nextDayStart.setDate(nextDayStart.getDate() + 1);

    const segmentEnd = new Date(Math.min(nextDayStart.getTime(), end.getTime()));
    const diffSeconds = Math.floor((segmentEnd.getTime() - cursor.getTime()) / 1000);

    if (diffSeconds > 0) {
      segments.push({ date: dayStart, seconds: diffSeconds });
    }

    cursor = segmentEnd;
  }

  const accumulated = segments.reduce((acc, seg) => acc + seg.seconds, 0);
  const delta = expectedTotalSeconds - accumulated;
  if (delta > 0 && segments.length > 0) {
    segments[segments.length - 1].seconds += delta;
  }

  return segments;
}

/**
 * Script de test pour vérifier le découpage des sessions vocales à minuit
 */
async function testMidnightSplit() {
  try {
    console.log('🧪 Test du découpage des sessions vocales à minuit\n');

    // Test 1: Session dans la même journée (23h50 à 23h59)
    console.log('📅 Test 1: Session dans la même journée (23h50 à 23h59)');
    const test1Start = new Date();
    test1Start.setHours(23, 50, 0, 0);
    const test1End = new Date();
    test1End.setHours(23, 59, 0, 0);
    const test1Duration = Math.floor((test1End.getTime() - test1Start.getTime()) / 1000);

    console.log(`   Début: ${test1Start.toLocaleString('fr-FR')}`);
    console.log(`   Fin:   ${test1End.toLocaleString('fr-FR')}`);
    console.log(`   Durée: ${test1Duration} secondes (${Math.floor(test1Duration / 60)} minutes)`);

    const test1Segments = splitSessionIntoDailySegments(test1Start, test1End, test1Duration);
    console.log(`   ✅ Résultat: ${test1Segments.length} segment(s)`);
    test1Segments.forEach((seg, i) => {
      console.log(`      ${i + 1}. ${seg.date.toLocaleString('fr-FR')} → ${seg.seconds}s (${Math.floor(seg.seconds / 60)}min)`);
    });
    console.log();

    // Test 2: Session qui chevauche minuit (23h50 à 00h10)
    console.log('📅 Test 2: Session qui chevauche minuit (23h50 à 00h10)');
    const test2Start = new Date();
    test2Start.setHours(23, 50, 0, 0);
    const test2End = new Date(test2Start);
    test2End.setDate(test2End.getDate() + 1);
    test2End.setHours(0, 10, 0, 0);
    const test2Duration = Math.floor((test2End.getTime() - test2Start.getTime()) / 1000);

    console.log(`   Début: ${test2Start.toLocaleString('fr-FR')}`);
    console.log(`   Fin:   ${test2End.toLocaleString('fr-FR')}`);
    console.log(`   Durée: ${test2Duration} secondes (${Math.floor(test2Duration / 60)} minutes)`);

    const test2Segments = splitSessionIntoDailySegments(test2Start, test2End, test2Duration);
    console.log(`   ✅ Résultat: ${test2Segments.length} segment(s)`);
    test2Segments.forEach((seg, i) => {
      console.log(`      ${i + 1}. ${seg.date.toLocaleString('fr-FR')} → ${seg.seconds}s (${Math.floor(seg.seconds / 60)}min)`);
    });
    console.log();

    // Test 3: Intégration avec la DB
    console.log('💾 Test 3: Intégration avec la base de données');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/la-station';
    await mongoose.connect(mongoUri);
    console.log('   ✅ Connecté à MongoDB');

    const testUserId = 'test-user-midnight';
    const testGuildId = 'test-guild';

    await GuildUserModel.deleteMany({ discordId: testUserId, guildId: testGuildId });

    // Créer un utilisateur et lui ajouter les segments du test 2
    const user = await GuildUserModel.create({
      discordId: testUserId,
      name: 'TestUser',
      guildId: testGuildId
    });

    test2Segments.forEach(segment => {
      user.stats.voiceHistory.push({
        date: segment.date,
        time: segment.seconds
      } as any);
    });
    user.stats.voiceTime = test2Duration;
    await user.save();

    console.log(`   ✅ Utilisateur créé avec ${user.stats.voiceHistory.length} entrée(s) dans l'historique`);
    user.stats.voiceHistory.forEach((entry, i) => {
      const date = new Date(entry.date);
      console.log(`      ${i + 1}. ${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR')} → ${entry.time}s`);
    });

    // Vérification que les dates sont bien à minuit (00h00)
    console.log('\n🔍 Vérifications:');
    const allAtMidnight = user.stats.voiceHistory.every(entry => {
      const d = new Date(entry.date);
      return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
    });
    console.log(`   ${allAtMidnight ? '✅' : '❌'} Toutes les dates sont à minuit (00h00)`);
    console.log(`   ${test2Segments.length === 2 ? '✅' : '❌'} 2 segments créés (${test2Segments.length})`);
    console.log(`   ${user.stats.voiceTime === test2Duration ? '✅' : '❌'} Durée totale correcte (${user.stats.voiceTime}s)`);

    // Nettoyer
    await GuildUserModel.deleteMany({ discordId: testUserId, guildId: testGuildId });
    console.log('\n🧹 Données de test nettoyées');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Déconnecté de MongoDB');
  }
}

testMidnightSplit();
