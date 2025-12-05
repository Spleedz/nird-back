// Récupérer la progression d'un utilisateur
app.get('/api/users/:userId/progress', (req, res) => {
  const user = db.users.find(u => u.id === req.params.userId);

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  const userProgress = Object.values(db.progress).filter(p => p.userId === user.id);

  res.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      pillarsProgress: user.pillarsProgress,
      totalPoints: user.totalPoints,
      completedMissions: user.completedMissions
    },
    activeMissions: userProgress.filter(p => !p.completed),
    completedCount: user.completedMissions.length
  });
});