const express = require("express");
const router = express.Router();

// Healthcheck simple
router.get("/health", (req, res) => {
  res.json({ status: "ok", message: "API NIRD opérationnelle" });
});

// Info simple sur l’app
router.get("/info", (req, res) => {
  res.json({
    app: "NIRD - Village Numérique Résistant",
    version: "1.0.0",
  });
});

module.exports = router;
