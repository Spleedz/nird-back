// Récupérer le classement global
app.get('/api/leaderboard', (req, res) => {
  const { limit = 10, role } = req.query;

  let leaderboard = db.users
    .map(u => ({
      username: u.username,
      role: u.role,
      totalPoints: u.totalPoints,
      completedMissions: u.completedMissions.length,
      pillarsProgress: u.pillarsProgress
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  // Filtrer par rôle si spécifié
  if (role) {
    leaderboard = leaderboard.filter(u => u.role === role);
  }

  leaderboard = leaderboard.slice(0, parseInt(limit));

  res.json({ leaderboard });
});