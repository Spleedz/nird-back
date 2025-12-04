// Récupérer toutes les missions
app.get('/api/missions', (req, res) => {
  const { role, placeId } = req.query;

  let missions = getMissionsData();

  // Filtrer par lieu si spécifié
  if (placeId) {
    missions = missions.filter(m => m.placeId === placeId);
  }

  // Filtrer par rôle si spécifié
  if (role) {
    missions = missions.filter(m => !m.rolesRequis || m.rolesRequis.includes(role));
  }

  res.json({ missions });
});

// Récupérer une mission spécifique
app.get('/api/missions/:missionId', (req, res) => {
  const missions = getMissionsData();
  const mission = missions.find(m => m.id === req.params.missionId);

  if (!mission) {
    return res.status(404).json({ error: 'Mission non trouvée' });
  }

  res.json({ mission });
});

// Commencer une mission
app.post('/api/missions/:missionId/start', (req, res) => {
  const { userId } = req.body;
  const missions = getMissionsData();
  const mission = missions.find(m => m.id === req.params.missionId);
  const user = db.users.find(u => u.id === userId);

  if (!mission) {
    return res.status(404).json({ error: 'Mission non trouvée' });
  }

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  // Vérifier si déjà complétée
  if (user.completedMissions.includes(mission.id)) {
    return res.status(400).json({ error: 'Mission déjà complétée' });
  }

  // Créer une entrée de progression
  const progressId = `progress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  db.progress[progressId] = {
    id: progressId,
    userId,
    missionId: mission.id,
    startedAt: new Date().toISOString(),
    currentStep: 0,
    completed: false
  };

  res.status(201).json({ 
    message: 'Mission démarrée',
    progress: db.progress[progressId],
    mission
  });
});

// Compléter une mission
app.post('/api/missions/:missionId/complete', (req, res) => {
  const { userId, answers } = req.body;
  const missions = getMissionsData();
  const mission = missions.find(m => m.id === req.params.missionId);
  const user = db.users.find(u => u.id === userId);

  if (!mission || !user) {
    return res.status(404).json({ error: 'Mission ou utilisateur non trouvé' });
  }

  // Calculer les points et la progression des piliers
  const points = mission.points || 100;
  user.totalPoints += points;

  // Mettre à jour les piliers
  mission.pillarsImpact.forEach(impact => {
    user.pillarsProgress[impact.pillar] = Math.min(
      100,
      user.pillarsProgress[impact.pillar] + impact.value
    );
  });

  // Marquer comme complétée
  if (!user.completedMissions.includes(mission.id)) {
    user.completedMissions.push(mission.id);
  }

  // Mettre à jour le leaderboard
  updateLeaderboard(user);

  res.json({
    message: 'Mission complétée !',
    user,
    pointsEarned: points,
    pillarsUpdated: mission.pillarsImpact
  });
});