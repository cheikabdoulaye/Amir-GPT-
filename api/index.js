const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = 'pagebot'; // Le même token que tu as mis sur Facebook

// Vérification Webhook (GET)
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// Réception de messages (POST)
app.post('/', (req, res) => {
  console.log('🔔 Reçu de Facebook:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

module.exports = app;
