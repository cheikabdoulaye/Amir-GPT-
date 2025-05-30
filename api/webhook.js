// 1. Importer ce qu'il faut
import { createServer } from 'vercel-http';
import express from 'express';
import axios from 'axios';

// 2. Créer ton app Express
const app = express();
app.use(express.json());

// 3. Route GET (pour vérifier que tout fonctionne)
app.get('/', (req, res) => {
  res.send('AMIR-GPT Webhook is live!');
});

// 4. Route POST (c'est ici que Facebook envoie les messages)
app.post('/webhook', async (req, res) => {
  try {
    console.log('Reçu webhook POST :', req.body);
    // Mets ici ton traitement si besoin
    res.sendStatus(200);
  } catch (error) {
    console.error('Erreur webhook POST :', error);
    res.sendStatus(500);
  }
});

// 5. Export pour que Vercel comprenne ton serveur
export default createServer(app);
