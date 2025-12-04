app.post('/api/users', (req, res) => {
  const { username, role } = req.body;

  if (!username || !role) {
    return res.status(400).json({ error: 'Username et role requis' });
  }

  // Vérifier si l'utilisateur existe déjà
  let user = db.users.find(u => u.username === username);

  if (!user) {
    user = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username,
      role,
      createdAt: new Date().toISOString(),
      pillarsProgress: {
        inclusion: 0,
        responsabilite: 0,
        durabilite: 0
      },
      completedMissions: [],
      totalPoints: 0
    };
    db.users.push(user);
  }

  res.status(201).json({ user });
});

// Récupérer un utilisateur par ID
app.get('/api/users/:userId', (req, res) => {
  const user = db.users.find(u => u.id === req.params.userId);

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  res.json({ user });
});

// Mettre à jour le rôle d'un utilisateur
app.patch('/api/users/:userId/role', (req, res) => {
  const { role } = req.body;
  const user = db.users.find(u => u.id === req.params.userId);

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  user.role = role;
  res.json({ user });
});