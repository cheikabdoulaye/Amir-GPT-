const express = require('express');
const app = express();
app.use(express.json());

app.all('/', async (req, res) => {
  res.send("✅ AMIR-GPT fonctionne ! Créé par Cheik Amir Guiatin, un Burkinabè 🇧🇫");
});

module.exports = app;
