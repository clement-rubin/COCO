export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(`
    <html>
      <head>
        <title>MongoDB non utilisé</title>
        <style>
          body { font-family: sans-serif; max-width: 800px; margin: 20px auto; line-height: 1.6; }
          h1 { color: #333; }
          .info { background: #e7f7ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>MongoDB n'est plus utilisé</h1>
        <div class="info">
          <p>Cette application utilise désormais uniquement Supabase comme base de données.</p>
          <p>Pour tester la connexion Supabase, veuillez utiliser:</p>
          <p><a href="/api/test-supabase">Test de connexion Supabase</a></p>
        </div>
      </body>
    </html>
  `);
}
