// ============================================================================
// server.js - Serveur Express complet
// Village Numérique Résistant - Nuit de l'Info 2025
// ============================================================================

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
require('dotenv').config();

// ===== NOUVELLE IMPORT: Podium/Missions =====
const { loadData, dataLoaderMiddleware } = require('./middleware/dataLoader');
const podiumRoutes = require('./routes/podium');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARES
// ============================================================================
app.use(helmet()); // Sécurité des headers HTTP
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev')); // Logs des requêtes
app.use(express.json()); // Parser JSON
app.use(express.urlencoded({ extended: true }));

// ===== NOUVEAU: Middleware Podium =====
app.use(dataLoaderMiddleware);

// ============================================================================
// BASE DE DONNÉES EN MÉMOIRE (Pour la Nuit de l'Info)
// ============================================================================
// En production, utilisez MongoDB, PostgreSQL, etc.
const db = {
  users: [],
  missions: [],
  progress: {},
  leaderboard: []
};

// ============================================================================
// ROUTES - USERS
// ============================================================================

// Créer ou récupérer un utilisateur
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

// ============================================================================
// ROUTES - MISSIONS
// ============================================================================

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

// ============================================================================
// ROUTES - PROGRESSION
// ============================================================================

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

// ============================================================================
// ROUTES - PODIUM / MISSIONS ENTREPRISE (NEW)
// ============================================================================
// Montage du routeur podium sous /api/podium
app.use('/api/podium', podiumRoutes);

// ============================================================================
// ROUTES - LEADERBOARD
// ============================================================================

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

// ============================================================================
// ROUTES - STATISTIQUES
// ============================================================================

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

// ============================================================================
// ROUTES - RESSOURCES
// ============================================================================

// Récupérer toutes les ressources
app.get('/api/resources', (req, res) => {
  const resources = getResourcesData();
  res.json({ resources });
});

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

function updateLeaderboard(user) {
  const existingEntry = db.leaderboard.findIndex(e => e.userId === user.id);
  
  const entry = {
    userId: user.id,
    username: user.username,
    role: user.role,
    totalPoints: user.totalPoints,
    completedMissions: user.completedMissions.length,
    updatedAt: new Date().toISOString()
  };

  if (existingEntry >= 0) {
    db.leaderboard[existingEntry] = entry;
  } else {
    db.leaderboard.push(entry);
  }

  db.leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
}

// Données des missions
function getMissionsData() {
  return [
    {
      id: 'mission-cloud-libre',
      title: 'Migrer vers le cloud libre',
      placeId: 'ecole',
      description: 'Remplacer Google Drive par Nextcloud pour retrouver la souveraineté sur nos données.',
      rolesRequis: ['enseignant', 'technicien', 'direction'],
      difficulty: 'medium',
      duration: '30 min',
      points: 150,
      steps: [
        'Installer Nextcloud sur un serveur local',
        'Migrer les documents existants',
        'Former les enseignants à l\'utilisation',
        'Configurer les permissions et partages'
      ],
      pillarsImpact: [
        { pillar: 'responsabilite', value: 20 },
        { pillar: 'durabilite', value: 10 }
      ],
      rewards: {
        badge: 'Maître du Cloud Libre',
        unlocksNext: ['mission-formats-ouverts']
      }
    },
    {
      id: 'mission-linux-revival',
      title: 'Renaissance Linux',
      placeId: 'salle-info',
      description: 'Redonner vie à 10 ordinateurs obsolètes en installant une distribution Linux légère.',
      rolesRequis: ['technicien', 'enseignant'],
      difficulty: 'easy',
      duration: '45 min',
      points: 120,
      steps: [
        'Évaluer le matériel disponible',
        'Choisir la distribution (Emmabuntüs, Xubuntu...)',
        'Créer une clé USB bootable',
        'Installer et configurer les postes'
      ],
      pillarsImpact: [
        { pillar: 'durabilite', value: 25 },
        { pillar: 'inclusion', value: 15 }
      ],
      rewards: {
        badge: 'Sauveur de Machines',
        unlocksNext: []
      }
    },
    {
      id: 'mission-cantine-libre',
      title: 'Cantine sans frais cachés',
      placeId: 'cantine',
      description: 'Déployer une solution open-source de gestion de cantine.',
      rolesRequis: ['direction', 'parent', 'collectivite'],
      difficulty: 'medium',
      duration: '40 min',
      points: 130,
      steps: [
        'Analyser les besoins fonctionnels',
        'Comparer les solutions open-source disponibles',
        'Mettre en place un pilote sur 1 mois',
        'Former le personnel de cantine'
      ],
      pillarsImpact: [
        { pillar: 'responsabilite', value: 15 },
        { pillar: 'inclusion', value: 20 }
      ],
      rewards: {
        badge: 'Champion de l\'Inclusion',
        unlocksNext: []
      }
    },
    {
      id: 'mission-datacenter-mutualise',
      title: 'Data Center Collectif',
      placeId: 'data-center',
      description: 'Créer un data center mutualisé entre 5 établissements avec énergie renouvelable.',
      rolesRequis: ['technicien', 'collectivite', 'direction'],
      difficulty: 'hard',
      duration: '60 min',
      points: 200,
      steps: [
        'Réunir les établissements partenaires',
        'Choisir un hébergeur local et éthique',
        'Calculer les économies d\'échelle',
        'Signer une convention de mutualisation'
      ],
      pillarsImpact: [
        { pillar: 'durabilite', value: 30 },
        { pillar: 'responsabilite', value: 20 },
        { pillar: 'inclusion', value: 10 }
      ],
      rewards: {
        badge: 'Architecte du Futur',
        unlocksNext: []
      }
    }
  ];
}

// Données des ressources
function getResourcesData() {
  return [
    {
      id: 'nird-officiel',
      title: 'Site officiel NIRD',
      description: 'La référence sur le Numérique Inclusif, Responsable et Durable',
      url: 'https://www.nird.fr',
      category: 'general',
      pillar: 'responsabilite'
    },
    {
      id: 'framasoft',
      title: 'Framasoft',
      description: 'Association promouvant le logiciel libre et les services éthiques',
      url: 'https://framasoft.org',
      category: 'logiciels-libres',
      pillar: 'responsabilite'
    },
    {
      id: 'emmabuntus',
      title: 'Emmabuntüs',
      description: 'Distribution Linux pour redonner vie aux vieux ordinateurs',
      url: 'https://emmabuntus.org',
      category: 'systemes',
      pillar: 'durabilite'
    },
    {
      id: 'asso-hopen',
      title: 'HOP - Halte à l\'Obsolescence',
      description: 'Lutter contre l\'obsolescence programmée',
      url: 'https://www.halteobsolescence.org',
      category: 'durabilite',
      pillar: 'durabilite'
    },
    {
      id: 'april',
      title: 'April',
      description: 'Association de promotion et défense du logiciel libre',
      url: 'https://www.april.org',
      category: 'logiciels-libres',
      pillar: 'responsabilite'
    },
    {
      id: 'asso-chatons',
      title: 'CHATONS',
      description: 'Collectif d\'hébergeurs alternatifs transparents et solidaires',
      url: 'https://chatons.org',
      category: 'hebergement',
      pillar: 'responsabilite'
    }
  ];
}

// ============================================================================
// ROUTE DE TEST
// ============================================================================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Village Numérique Résistant API',
    timestamp: new Date().toISOString(),
    dbStats: {
      users: db.users.length,
      missions: getMissionsData().length,
      activeProgress: Object.keys(db.progress).length
    }
  });
});

// ============================================================================
// GESTION DES ERREURS
// ============================================================================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Erreur serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

// Route 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// ============================================================================
// DÉMARRAGE DU SERVEUR
// ============================================================================
// ===== NOUVEAU: Charger les données avant de démarrer =====
loadData();

app.listen(PORT, () => {
  console.log(`🏰 Village Numérique Résistant API`);
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 CORS activé pour: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🏆 Podium API disponible sur /api/podium/*`);
});