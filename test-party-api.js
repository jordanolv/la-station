// Utilise la fetch native de Node.js v18+

async function createTestEvent() {
  const API_BASE = 'http://localhost:3051';
  const GUILD_ID = '1299121206431191181';
  
  // Données de test pour l'événement
  const formData = new FormData();
  formData.append('name', 'Test Event API');
  formData.append('game', 'Test Game');
  formData.append('gameId', 'custom'); // ou un vrai ID de jeu
  formData.append('description', 'Ceci est un test de création d\'événement via API');
  formData.append('date', '2025-12-31'); // Date de test (future)
  formData.append('time', '20:00'); // Heure de test
  formData.append('maxSlots', '4');
  formData.append('channelId', '1299297051045007402');
  formData.append('color', '#FF6B6B');
  formData.append('createdBy', '100336379577262080'); // Remplacez par votre vrai user ID Discord
  // formData.append('announcementChannelId', 'YOUR_ANNOUNCEMENT_CHANNEL_ID'); // Optionnel
  
  try {
    const response = await fetch(`${API_BASE}/api/party?guildId=${GUILD_ID}`, {
      method: 'POST',
      body: formData
    });
    
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    const text = await response.text();
    console.log('Raw response:', text);
    
    try {
      const result = JSON.parse(text);
      
      if (response.ok) {
        console.log('✅ Événement créé avec succès!');
        console.log('Event ID:', result.event._id);
        console.log('Message ID:', result.event.messageId);
        console.log('Thread ID:', result.event.threadId);
        console.log('Données complètes:', JSON.stringify(result, null, 2));
      } else {
        console.log('❌ Erreur lors de la création:');
        console.log('Status:', response.status);
        console.log('Erreur:', result.error);
      }
    } catch (jsonError) {
      console.log('❌ Réponse non-JSON reçue:', text);
    }
  } catch (error) {
    console.error('❌ Erreur réseau:', error.message);
  }
}

// Fonction pour lister les événements existants
async function listEvents() {
  const API_BASE = 'http://localhost:3051';
  const GUILD_ID = '1299121206431191181';
  
  try {
    const response = await fetch(`${API_BASE}/api/party?guildId=${GUILD_ID}`);
    
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    const text = await response.text();
    console.log('Raw response:', text);
    
    try {
      const result = JSON.parse(text);
      console.log('📋 Événements existants:', JSON.stringify(result, null, 2));
    } catch (jsonError) {
      console.log('❌ Réponse non-JSON reçue:', text);
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération:', error.message);
  }
}

// Exécuter les tests
async function runTests() {
  console.log('🚀 Début des tests API Party...\n');
  
  console.log('1. Liste des événements existants:');
  await listEvents();
  
  console.log('\n2. Création d\'un nouvel événement:');
  await createTestEvent();
  
  console.log('\n3. Liste après création:');
  await listEvents();
}

runTests();