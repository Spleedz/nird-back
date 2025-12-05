const express = require('express');
const router = express.Router();

/**
 * GET /api/podium/mission/:missionId/teams
 * Récupère toutes les équipes d'une mission
 */
router.get('/mission/:missionId/teams', (req, res) => {
  const { missionId } = req.params;
  const id = parseInt(missionId, 10);

  const mission = req.podium.getMissionById(id);
  if (!mission) {
    return res.status(404).json({ error: `Mission ${id} non trouvée` });
  }

  const teams = req.podium.getTeamsByMissionId(id);
  res.json({
    missionId: id,
    missionTitle: mission.Title,
    missionUrl: mission.Url,
    teamCount: teams.length,
    teams: teams.map(t => ({
      teamId: t.Id,
      name: t.Name,
      url: t.Url,
      membersCount: t.Members.length,
      members: t.Members
    }))
  });
});

/**
 * GET /api/podium/mission/:missionId/ranking
 * Récupère le classement (équipes + scores) trié par score DESC
 * PARAMÈTRE OPTIONNEL: ?limit=10 pour limiter les résultats
 */
router.get('/mission/:missionId/ranking', (req, res) => {
  const { missionId } = req.params;
  const { limit } = req.query;
  const id = parseInt(missionId, 10);

  const mission = req.podium.getMissionById(id);
  if (!mission) {
    return res.status(404).json({ error: `Mission ${id} non trouvée` });
  }

  let ranking = req.podium.getRankingForMission(id);

  // Appliquer le limit si fourni
  if (limit) {
    ranking = ranking.slice(0, parseInt(limit, 10));
  }

  // Ajouter les rangs
  const rankedTeams = ranking.map((team, index) => ({
    rank: index + 1,
    ...team
  }));

  res.json({
    missionId: id,
    missionTitle: mission.Title,
    timestamp: new Date().toISOString(),
    teams: rankedTeams
  });
});

/**
 * POST /api/podium/mission/:missionId/update-score
 * Met à jour le score d'une équipe
 * 
 * APPROCHE: Mise à jour ABSOLUE
 * Body: { "teamId": number, "newScore": number }
 * 
 * Alternatives (choix architectural):
 * - DELTA: { "teamId": number, "deltaScore": number } → addToTeamScore()
 * - ABSOLU (choisi ici): { "teamId": number, "newScore": number } → updateTeamScore()
 * 
 * JUSTIFICATION: Plus simple pour l'UI admin (input de nombre plutôt que +10, -5)
 *                et déterministe (pas de race condition en cas de requête dupliquée).
 */
router.post('/mission/:missionId/update-score', (req, res) => {
  const { missionId } = req.params;
  const { teamId, newScore } = req.body;
  const id = parseInt(missionId, 10);
  const tId = parseInt(teamId, 10);

  // Validation
  if (!Number.isInteger(tId) || !Number.isInteger(newScore)) {
    return res.status(400).json({ 
      error: 'Body invalide. Expected: { teamId: number, newScore: number }' 
    });
  }

  const mission = req.podium.getMissionById(id);
  if (!mission) {
    return res.status(404).json({ error: `Mission ${id} non trouvée` });
  }

  const teams = req.podium.getTeamsByMissionId(id);
  const teamExists = teams.some(t => t.Id === tId);
  if (!teamExists) {
    return res.status(404).json({ error: `Équipe ${tId} non trouvée dans la mission ${id}` });
  }

  // Mettre à jour
  const updated = req.podium.updateTeamScore(id, tId, newScore);

  // Retourner le nouveau classement
  const newRanking = req.podium.getRankingForMission(id);
  const rankedTeams = newRanking.map((team, index) => ({
    rank: index + 1,
    ...team
  }));

  res.json({
    success: true,
    message: `Score de l'équipe ${tId} mis à jour à ${newScore}`,
    updated,
    newRanking: rankedTeams
  });
});

/**
 * POST /api/podium/mission/:missionId/add-score (BONUS)
 * Ajoute des points (approche DELTA)
 * Body: { "teamId": number, "deltaScore": number }
 */
router.post('/mission/:missionId/add-score', (req, res) => {
  const { missionId } = req.params;
  const { teamId, deltaScore } = req.body;
  const id = parseInt(missionId, 10);
  const tId = parseInt(teamId, 10);

  if (!Number.isInteger(tId) || !Number.isInteger(deltaScore)) {
    return res.status(400).json({ 
      error: 'Body invalide. Expected: { teamId: number, deltaScore: number }' 
    });
  }

  const mission = req.podium.getMissionById(id);
  if (!mission) {
    return res.status(404).json({ error: `Mission ${id} non trouvée` });
  }

  // Mettre à jour (DELTA)
  const updated = req.podium.addToTeamScore(id, tId, deltaScore);

  // Retourner le nouveau classement
  const newRanking = req.podium.getRankingForMission(id);
  const rankedTeams = newRanking.map((team, index) => ({
    rank: index + 1,
    ...team
  }));

  res.json({
    success: true,
    message: `Score de l'équipe ${tId} augmenté de ${deltaScore} (nouveau: ${updated.score})`,
    updated,
    newRanking: rankedTeams
  });
});

/**
 * GET /api/podium/missions
 * Retourne la liste de toutes les missions disponibles (pour le menu)
 */
router.get('/missions', (req, res) => {
  const nuitData = req.podium.getNuitData();
  const missions = (nuitData.Missions || []).map(m => ({
    id: m.Id,
    title: m.Title,
    url: m.Url,
    teamCount: m.TeamIds?.length || 0
  }));

  res.json({ missions });
});

/**
 * GET /api/podium/teams
 * Retourne TOUTES les équipes avec leurs infos complètes
 */
router.get('/teams', (req, res) => {
  const nuitData = req.podium.getNuitData();
  const teams = (nuitData.Teams || []).map(t => ({
    teamId: t.Id,
    name: t.Name,
    url: t.Url,
    membersCount: t.Members?.length || 0,
    members: t.Members || [],
    missionIds: t.MissionIds || []
  }));

  res.json({ 
    teamCount: teams.length,
    teams 
  });
});

module.exports = router;
