const express = require("express");
const router = express.Router();

// Liste de défis NIRD (mock)
router.get("/challenges", (req, res) => {
  const challenges = [
    {
      id: 1,
      title: "Réduire l’empreinte du parc informatique",
      description:
        "Choisir entre réemploi, achat neuf ou location pour les postes de travail.",
    },
    {
      id: 2,
      title: "Passer aux logiciels libres",
      description:
        "Remplacer une suite propriétaire par des outils libres et durables.",
    },
  ];

  res.json(challenges);
});

// Exemple : réception d’un score
router.post("/score", (req, res) => {
  const { playerName, score } = req.body;

  res.status(201).json({
    message: "Score reçu",
    playerName,
    score,
  });
});

module.exports = router;
