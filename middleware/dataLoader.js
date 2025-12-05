const fs = require('fs');
const path = require('path');

let nuitData = null;
let scoresData = null;

/**
 * Charge les données JSON au démarrage du serveur
 * Expose nuitData et scoresData globalement
 */
const loadData = () => {
  try {
    const nuitDataPath = path.join(__dirname, '../data/nuitdelinfo.json');
    const scoresPath = path.join(__dirname, '../data/scores.json');

    // Charger les données de la Nuit de l'Info (missions + équipes)
    nuitData = JSON.parse(fs.readFileSync(nuitDataPath, 'utf-8'));
    console.log(`✅ Données Nuit de l'Info chargées: ${nuitData.Missions?.length || 0} missions, ${nuitData.Teams?.length || 0} équipes`);

    // Charger les scores
    scoresData = JSON.parse(fs.readFileSync(scoresPath, 'utf-8'));
    console.log(`✅ Scores chargés: ${scoresData.length} entrées`);
  } catch (error) {
    console.error('❌ Erreur chargement données:', error.message);
    process.exit(1);
  }
};

/**
 * Récupère une mission par ID
 */
const getMissionById = (missionId) => {
  return nuitData.Missions?.find(m => m.Id === missionId) || null;
};

/**
 * Récupère toutes les équipes d'une mission
 */
const getTeamsByMissionId = (missionId) => {
  const mission = getMissionById(missionId);
  if (!mission) return [];

  return mission.TeamIds
    .map(teamId => nuitData.Teams?.find(t => t.Id === teamId))
    .filter(team => team !== undefined);
};

/**
 * Récupère le score d'une équipe pour une mission
 * Retourne 0 si pas trouvé
 */
const getTeamScore = (missionId, teamId) => {
  const scoreEntry = scoresData.find(s => s.missionId === missionId && s.teamId === teamId);
  return scoreEntry?.score || 0;
};

/**
 * Récupère le classement complet d'une mission (équipes + scores, trié)
 */
const getRankingForMission = (missionId) => {
  const teams = getTeamsByMissionId(missionId);

  const ranking = teams.map(team => ({
    teamId: team.Id,
    name: team.Name,
    url: team.Url,
    members: team.Members,
    score: getTeamScore(missionId, team.Id)
  }));

  // Trier par score décroissant, puis par ID croissant (déterminisme)
  return ranking.sort((a, b) => b.score - a.score || a.teamId - b.teamId);
};

/**
 * Met à jour le score d'une équipe (DELTA ou ABSOLU)
 * @param {number} missionId
 * @param {number} teamId
 * @param {number} newScore - valeur absolue (on remplace)
 * @returns {object} - l'objet score mis à jour
 */
const updateTeamScore = (missionId, teamId, newScore) => {
  // Clamp entre 0 et 10000
  const score = Math.max(0, Math.min(10000, newScore));

  const existingIndex = scoresData.findIndex(
    s => s.missionId === missionId && s.teamId === teamId
  );

  if (existingIndex >= 0) {
    scoresData[existingIndex].score = score;
    scoresData[existingIndex].updatedAt = new Date().toISOString();
  } else {
    scoresData.push({
      missionId,
      teamId,
      score,
      updatedAt: new Date().toISOString()
    });
  }

  // Sauvegarder les changements en disque
  const scoresPath = path.join(__dirname, '../data/scores.json');
  fs.writeFileSync(scoresPath, JSON.stringify(scoresData, null, 2));

  return scoresData[existingIndex >= 0 ? existingIndex : scoresData.length - 1];
};

/**
 * Ajoute des points à un score existant (DELTA)
 */
const addToTeamScore = (missionId, teamId, deltaScore) => {
  const currentScore = getTeamScore(missionId, teamId);
  const newScore = currentScore + deltaScore;
  return updateTeamScore(missionId, teamId, newScore);
};

/**
 * Middleware Express pour exposer les fonctions
 */
const dataLoaderMiddleware = (req, res, next) => {
  req.podium = {
    getMissionById,
    getTeamsByMissionId,
    getTeamScore,
    getRankingForMission,
    updateTeamScore,
    addToTeamScore,
    getNuitData: () => nuitData
  };
  next();
};

module.exports = {
  loadData,
  dataLoaderMiddleware
};
