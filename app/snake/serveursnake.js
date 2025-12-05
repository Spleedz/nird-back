const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Scores en mémoire (temporaire)
let scores = [];

// récupérer les scores
app.get("/scores", (req, res) => {
  res.json(scores);
});

// envoyer un score
app.post("/scores", (req, res) => {
  const { player, score } = req.body;

  scores.push({ player, score, date: new Date().toISOString() });

  res.json({ message: "Score enregistré !" });
});

// démarrer le serveur
app.listen(3001, () => {
  console.log("Backend lancé : http://localhost:3001");
});
