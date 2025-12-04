const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Bonjour depuis le backend Node.js dans Docker !');
});

app.get('/api/data', (req, res) => {
  res.json({ message: "Données reçues du serveur", timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});