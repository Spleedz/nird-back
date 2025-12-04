const express = require("express");
const cors = require("cors");

const apiRouter = require("./routes");
const nirdRouter = require("./routes/nird");

const app = express();
const PORT = 3001;

// Middlewares
app.use(
  cors({
    origin: "http://localhost:5173", // Vite
  })
);
app.use(express.json());

// Routes
app.use("/api", apiRouter);        // /api/health, /api/info
app.use("/api/nird", nirdRouter);  // /api/nird/challenges, /api/nird/score

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Backend NIRD démarré sur http://localhost:${PORT}`);
});
