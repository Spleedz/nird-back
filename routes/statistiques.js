// Statistiques globales du village
app.get('/api/stats', (req, res) => {
  const totalUsers = db.users.length;
  const totalMissions = getMissionsData().length;
  const totalCompletedMissions = db.users.reduce((sum, u) => sum + u.completedMissions.length, 0);

  // Calcul de la progression moyenne par pilier
  const avgPillars = {
    inclusion: 0,
    responsabilite: 0,
    durabilite: 0
  };

  if (totalUsers > 0) {
    db.users.forEach(u => {
      avgPillars.inclusion += u.pillarsProgress.inclusion;
      avgPillars.responsabilite += u.pillarsProgress.responsabilite;
      avgPillars.durabilite += u.pillarsProgress.durabilite;
    });

    avgPillars.inclusion = Math.round(avgPillars.inclusion / totalUsers);
    avgPillars.responsabilite = Math.round(avgPillars.responsabilite / totalUsers);
    avgPillars.durabilite = Math.round(avgPillars.durabilite / totalUsers);
  }

  // Répartition par rôle
  const roleDistribution = db.users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  res.json({
    totalUsers,
    totalMissions,
    totalCompletedMissions,
    averagePillarsProgress: avgPillars,
    roleDistribution,
    completionRate: totalUsers > 0 
      ? Math.round((totalCompletedMissions / (totalUsers * totalMissions)) * 100) 
      : 0
  });
});