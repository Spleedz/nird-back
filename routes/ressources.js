// Récupérer toutes les ressources
app.get('/api/resources', (req, res) => {
  const resources = getResourcesData();
  res.json({ resources });
});