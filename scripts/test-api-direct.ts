/**
 * Test direct de l'API pour vérifier le format de réponse
 * Ce script appelle directement l'API HTTP pour voir ce qu'elle retourne vraiment
 */

async function testAPIDirect() {
  console.log('='.repeat(80));
  console.log('TEST DIRECT : API Publication');
  console.log('='.repeat(80));
  console.log();

  const baseURL = process.env.API_URL || 'http://localhost:3001';
  
  try {
    // TEST 1 : Appeler l'endpoint sans authentification (pour voir la structure)
    console.log('📡 TEST 1 : Appel direct à l\'API');
    console.log('-'.repeat(80));
    console.log(`URL : ${baseURL}/api/publications/departments?page=1&limit=5`);
    console.log();

    const response = await fetch(`${baseURL}/api/publications/departments?page=1&limit=5`);
    
    console.log(`Status : ${response.status} ${response.statusText}`);
    console.log();

    if (response.status === 401) {
      console.log('⚠️  Authentification requise (normal)');
      console.log();
      
      // Essayer de voir les headers de réponse
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log('Headers :');
      console.log(JSON.stringify(headers, null, 2));
      console.log();
    } else if (response.ok) {
      const data = await response.json();
      
      console.log('✅ Réponse reçue :');
      console.log('-'.repeat(80));
      
      // Analyser la structure
      const keys = Object.keys(data);
      console.log('Clés présentes :', keys.join(', '));
      console.log();
      
      console.log('Analyse :');
      console.log(`  hasEntities: ${!!data.entities}`);
      console.log(`  hasDepartments: ${!!data.departments}`);
      console.log(`  total: ${data.total}`);
      console.log(`  page: ${data.page}`);
      console.log(`  limit: ${data.limit}`);
      console.log();
      
      const items = data.entities || data.departments || [];
      if (items.length > 0) {
        console.log('Premier élément :');
        console.log(JSON.stringify(items[0], null, 2));
        console.log();
        
        console.log('Type du premier élément :', items[0].type || 'ABSENT');
        console.log();
      }
      
      // Vérifier si des communes sont présentes
      const communes = items.filter((e: any) => e.type === 'COMMUNE');
      console.log(`Communes trouvées : ${communes.length}`);
      
      if (communes.length > 0) {
        console.log('✅ SUCCÈS : Communes d\'Abidjan présentes !');
        communes.forEach((c: any, i: number) => {
          console.log(`  ${i + 1}. ${c.libelle}`);
        });
      } else {
        console.log('❌ PROBLÈME : Aucune commune trouvée');
      }
      console.log();
      
    } else {
      const error = await response.text();
      console.log('❌ Erreur :');
      console.log(error);
    }

    // TEST 2 : Vérifier la version compilée
    console.log('🔍 TEST 2 : Vérifier la version du code compilé');
    console.log('-'.repeat(80));
    
    const fs = require('fs');
    const serviceJsPath = 'dist/src/publication/publication.service.js';
    
    if (fs.existsSync(serviceJsPath)) {
      const content = fs.readFileSync(serviceJsPath, 'utf-8');
      
      const hasEntitiesReturn = content.includes('entities: paginated');
      const hasGetAbidjanCommunes = content.includes('getAbidjanCommunes');
      const hasGetCelsForCommune = content.includes('getCelsForCommune');
      
      console.log(`✅ Code compilé contient 'entities: paginated' : ${hasEntitiesReturn}`);
      console.log(`✅ Code compilé contient 'getAbidjanCommunes' : ${hasGetAbidjanCommunes}`);
      console.log(`✅ Code compilé contient 'getCelsForCommune' : ${hasGetCelsForCommune}`);
      console.log();
      
      if (hasEntitiesReturn && hasGetAbidjanCommunes && hasGetCelsForCommune) {
        console.log('✅ Le code compilé est CORRECT et à jour');
        console.log();
        console.log('🚨 PROBLÈME : Le serveur utilise probablement une ancienne version !');
        console.log();
        console.log('SOLUTIONS :');
        console.log('  1. Arrêter complètement tous les processus Node.js');
        console.log('  2. Supprimer le dossier dist/');
        console.log('  3. Recompiler : npm run build');
        console.log('  4. Redémarrer : npm run start:dev');
        console.log();
      } else {
        console.log('❌ Le code compilé semble être ancien');
        console.log('   Exécutez : npm run build');
      }
    } else {
      console.log('❌ Fichier compilé non trouvé');
      console.log(`   Chemin cherché : ${serviceJsPath}`);
    }
    console.log();

    // TEST 3 : Vérifier le port
    console.log('🔍 TEST 3 : Vérifier le port de l\'API');
    console.log('-'.repeat(80));
    console.log(`Port configuré dans .env : ${process.env.PORT || '3001 (défaut)'}`);
    console.log(`URL testée : ${baseURL}`);
    console.log();
    console.log('⚠️  Vérifiez que le frontend appelle bien le bon port !');
    console.log();

  } catch (error) {
    console.error('❌ ERREUR lors du test:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
  }
}

testAPIDirect()
  .then(() => {
    console.log('✅ Test terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

