import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html');
  
  // Fonction pour ajouter une ligne au résultat HTML
  const messages = [];
  function addMessage(text, type = 'info') {
    const colors = {
      info: 'black',
      success: 'green',
      warning: 'orange',
      error: 'red'
    };
    messages.push(`<div style="color: ${colors[type]}; margin: 5px 0;">
      ${type === 'error' ? '❌ ' : type === 'success' ? '✅ ' : type === 'warning' ? '⚠️ ' : 'ℹ️ '}
      ${text}
    </div>`);
  }

  try {
    addMessage("Test de diagnostic de connexion MongoDB", "info");
    addMessage(`Date et heure du test: ${new Date().toISOString()}`);
    
    // 1. Vérifier la présence de la variable d'environnement
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      addMessage("Variable d'environnement MONGODB_URI non définie!", "error");
      return res.status(500).send(`
        <html>
          <head><title>Test MongoDB - Échec</title>
          <style>body{font-family:sans-serif;max-width:800px;margin:20px auto;line-height:1.6}</style></head>
          <body>
            <h1>Diagnostic de connexion MongoDB</h1>
            ${messages.join('')}
            <h2>Solution</h2>
            <p>Vous devez définir la variable d'environnement MONGODB_URI dans votre fichier .env.local (développement) 
               ou dans les variables d'environnement de Netlify (production).</p>
          </body>
        </html>
      `);
    }
    
    // 2. Analyser l'URI pour vérifier le format
    addMessage(`Vérification du format de l'URI...`);
    
    // Masquer les informations sensibles pour l'affichage
    const maskedUri = uri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
    addMessage(`URI (masqué): ${maskedUri}`);
    
    if (!uri.includes('mongodb')) {
      addMessage("L'URI ne commence pas par 'mongodb://' ou 'mongodb+srv://'", "error");
    } else {
      addMessage("Format de base correct (commence par mongodb)", "success");
    }
    
    if (!uri.includes('@')) {
      addMessage("L'URI ne contient pas de séparateur '@' entre les informations d'authentification et l'hôte", "error");
    } else {
      addMessage("Séparateur d'authentification '@' trouvé", "success");
    }
    
    // 3. Extraire les composants pour le diagnostic
    try {
      const [protocol, rest] = uri.split('://');
      const [auth, hostPart] = rest.split('@');
      const [username, password] = auth.split(':');
      
      addMessage(`Protocole: ${protocol}`, "info");
      addMessage(`Nom d'utilisateur: ${username}`, "info");
      addMessage(`Mot de passe: ${'*'.repeat(password ? password.length : 0)}`, "info");
      
      if (!username || username.length < 1) {
        addMessage("Nom d'utilisateur vide ou manquant", "error");
      }
      
      if (!password || password.length < 1) {
        addMessage("Mot de passe vide ou manquant", "error");
      }
    } catch (parseError) {
      addMessage(`Erreur de parsing de l'URI: ${parseError.message}`, "error");
    }
    
    // 4. Tentative de connexion avec feedback étape par étape
    addMessage(`Tentative de connexion à MongoDB...`, "info");
    
    const dbName = process.env.MONGODB_DB || 'coco_recipes';
    addMessage(`Base de données cible: ${dbName}`, "info");
    
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      serverSelectionTimeoutMS: 10000,
      authSource: 'admin' // Spécifier explicitement la base d'authentification
    });
    
    // Étape 1: Établir la connexion TCP
    addMessage('Établissement de la connexion TCP...', "info");
    await client.connect();
    addMessage('Connexion TCP établie avec succès', "success");
    
    // Étape 2: Authentification
    addMessage('Vérification de l\'authentification...', "info");
    const db = client.db(dbName);
    
    // Étape 3: Exécuter une commande simple
    addMessage('Exécution de la commande ping...', "info");
    await db.command({ ping: 1 });
    addMessage('Commande ping exécutée avec succès', "success");
    
    // Étape 4: Liste des collections pour vérifier les permissions
    addMessage('Vérification des permissions - listage des collections...', "info");
    const collections = await db.listCollections().toArray();
    addMessage(`${collections.length} collection(s) trouvée(s)`, "success");
    
    collections.forEach(collection => {
      addMessage(`- Collection: ${collection.name}`, "info");
    });
    
    // Conclusion positive
    addMessage("✅ CONNEXION RÉUSSIE! Toutes les étapes de test ont réussi.", "success");
    
    // Fermer la connexion
    await client.close();
    
    // Renvoyer la réponse HTML complète
    return res.status(200).send(`
      <html>
        <head>
          <title>Test MongoDB - Succès</title>
          <style>
            body { font-family: sans-serif; max-width: 800px; margin: 20px auto; line-height: 1.6; }
            h1 { color: #333; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <h1>Diagnostic de connexion MongoDB</h1>
          ${messages.join('')}
          <h2>Conclusion</h2>
          <p>La connexion à MongoDB fonctionne correctement. Votre API devrait fonctionner maintenant.</p>
        </body>
      </html>
    `);
    
  } catch (error) {
    addMessage(`❌ ERREUR: ${error.message}`, "error");
    
    if (error.name) addMessage(`Type d'erreur: ${error.name}`, "error");
    if (error.code) addMessage(`Code d'erreur: ${error.code}`, "error");
    
    // Conseils spécifiques selon le type d'erreur
    if (error.message.includes('auth') || error.code === 18 || error.message.includes('authentication failed')) {
      addMessage("PROBLÈME D'AUTHENTIFICATION DÉTECTÉ", "error");
      addMessage("Votre nom d'utilisateur ou mot de passe est incorrect", "warning");
    } else if (error.message.includes('timed out')) {
      addMessage("PROBLÈME DE CONNEXION - TIMEOUT", "error");
      addMessage("Vérifiez que votre IP est autorisée dans MongoDB Atlas", "warning");
    } else if (error.message.includes('getaddrinfo') || error.message.includes('ENOTFOUND')) {
      addMessage("PROBLÈME DE RÉSOLUTION DNS", "error");
      addMessage("L'adresse du serveur MongoDB est incorrecte ou inaccessible", "warning");
    }
    
    // Renvoyer la réponse HTML avec les instructions de résolution
    return res.status(500).send(`
      <html>
        <head>
          <title>Test MongoDB - Échec</title>
          <style>
            body { font-family: sans-serif; max-width: 800px; margin: 20px auto; line-height: 1.6; }
            h1, h2 { color: #333; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
            .solution { background: #e7f7e7; padding: 15px; border-radius: 5px; margin-top: 20px; }
            .error { color: red; }
          </style>
        </head>
        <body>
          <h1>Diagnostic de connexion MongoDB</h1>
          ${messages.join('')}
          
          <div class="solution">
            <h2>Comment résoudre ce problème</h2>
            <ol>
              <li>Connectez-vous à <a href="https://cloud.mongodb.com" target="_blank">MongoDB Atlas</a></li>
              <li>Allez dans "Database Access" et vérifiez les informations d'utilisateur</li>
              <li>Si nécessaire, créez un nouvel utilisateur:
                <ul>
                  <li>Nom d'utilisateur: choisissez un nom simple</li>
                  <li>Authentification: Password</li>
                  <li>Mot de passe: utilisez un mot de passe fort</li>
                  <li>Rôle: "Atlas admin" ou au moins "readWriteAnyDatabase"</li>
                </ul>
              </li>
              <li>Allez dans "Network Access" et ajoutez votre IP actuelle</li>
              <li>Attendez que les modifications soient appliquées (environ 1-2 minutes)</li>
              <li>Mettez à jour votre variable d'environnement MONGODB_URI avec les nouvelles informations</li>
            </ol>
            
            <p>Format correct de la chaîne de connexion:</p>
            <pre>mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority</pre>
            
            <p><strong>Note:</strong> Remplacez username, password, et la partie cluster0.xxxxx.mongodb.net par vos informations.</p>
          </div>
        </body>
      </html>
    `);
  }
}
