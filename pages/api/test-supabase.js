import { supabase } from '../../lib/supabase';

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
    addMessage("Test de diagnostic de connexion Supabase", "info");
    addMessage(`Date et heure du test: ${new Date().toISOString()}`);
    
    // 1. Vérifier la présence des variables d'environnement
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      addMessage("Variables d'environnement Supabase non définies!", "error");
      return res.status(500).send(`
        <html>
          <head><title>Test Supabase - Échec</title>
          <style>body{font-family:sans-serif;max-width:800px;margin:20px auto;line-height:1.6}</style></head>
          <body>
            <h1>Diagnostic de connexion Supabase</h1>
            ${messages.join('')}
            <h2>Solution</h2>
            <p>Vous devez définir les variables d'environnement NEXT_PUBLIC_SUPABASE_URL et 
              NEXT_PUBLIC_SUPABASE_ANON_KEY dans votre fichier .env.local (développement) 
              ou dans les variables d'environnement de Netlify (production).</p>
          </body>
        </html>
      `);
    }
    
    addMessage(`URL Supabase: ${supabaseUrl}`, "info");
    addMessage("Clé anonyme trouvée", "success");
    
    // 2. Test de la connexion
    addMessage('Tentative de connexion à Supabase...', "info");
    
    // Test 1: Récupérer la version de Supabase
    const { error: healthError } = await supabase.from('_health').select('*').limit(1);
    
    if (healthError && healthError.message.includes("does not exist")) {
      addMessage("Connexion de base OK (l'erreur sur la table _health est normale)", "success");
    } else if (healthError) {
      throw healthError;
    }
    
    // Test 2: Vérifier si la table recipes existe
    try {
      addMessage('Vérification de la table recipes...', "info");
      const { data, error } = await supabase.from('recipes').select('count').limit(0);
      
      if (error) {
        if (error.message.includes("does not exist")) {
          addMessage("La table 'recipes' n'existe pas encore", "warning");
          addMessage("Vous devez créer cette table dans la console Supabase", "info");
        } else {
          throw error;
        }
      } else {
        addMessage("Table 'recipes' trouvée", "success");
      }
    } catch (tableError) {
      addMessage(`Erreur lors de la vérification de la table: ${tableError.message}`, "error");
    }
    
    // Conclusion positive
    addMessage("✅ TEST RÉUSSI! La connexion à Supabase fonctionne.", "success");
    
    // Renvoyer la réponse HTML complète
    return res.status(200).send(`
      <html>
        <head>
          <title>Test Supabase - Succès</title>
          <style>
            body { font-family: sans-serif; max-width: 800px; margin: 20px auto; line-height: 1.6; }
            h1 { color: #333; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
            .box { border: 1px solid #ccc; padding: 15px; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Diagnostic de connexion Supabase</h1>
          ${messages.join('')}
          <h2>Prochaines étapes</h2>
          <div class="box">
            <p>Pour créer la table nécessaire dans Supabase:</p>
            <ol>
              <li>Connectez-vous à la console Supabase</li>
              <li>Allez dans la section "Table Editor"</li>
              <li>Créez une nouvelle table appelée "recipes"</li>
              <li>Ajoutez les colonnes suivantes:</li>
              <ul>
                <li>id (type: uuid, primary key)</li>
                <li>title (type: text)</li>
                <li>description (type: text)</li>
                <li>image (type: text)</li>
                <li>prepTime (type: text)</li>
                <li>cookTime (type: text)</li>
                <li>category (type: text)</li>
                <li>author (type: text)</li>
                <li>ingredients (type: json)</li>
                <li>instructions (type: json)</li>
                <li>created_at (type: timestamp with timezone)</li>
                <li>updated_at (type: timestamp with timezone, nullable)</li>
              </ul>
            </ol>
          </div>
        </body>
      </html>
    `);
    
  } catch (error) {
    addMessage(`❌ ERREUR: ${error.message}`, "error");
    
    // Renvoyer la réponse HTML avec les instructions de résolution
    return res.status(500).send(`
      <html>
        <head>
          <title>Test Supabase - Échec</title>
          <style>
            body { font-family: sans-serif; max-width: 800px; margin: 20px auto; line-height: 1.6; }
            h1, h2 { color: #333; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
            .solution { background: #e7f7e7; padding: 15px; border-radius: 5px; margin-top: 20px; }
            .error { color: red; }
          </style>
        </head>
        <body>
          <h1>Diagnostic de connexion Supabase</h1>
          ${messages.join('')}
          
          <div class="solution">
            <h2>Comment résoudre ce problème</h2>
            <ol>
              <li>Vérifiez que vos variables d'environnement sont correctement configurées</li>
              <li>Assurez-vous que votre projet Supabase est actif</li>
              <li>Vérifiez que les règles de sécurité RLS (Row Level Security) ne bloquent pas votre accès</li>
              <li>Si le problème persiste, consultez les journaux de Supabase pour plus d'informations</li>
            </ol>
          </div>
        </body>
      </html>
    `);
  }
}
