const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Dossiers
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const TRACKS_FILE = path.join(DATA_DIR, 'tracks.json');

// Créer les dossiers si besoin
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(TRACKS_FILE)) fs.writeFileSync(TRACKS_FILE, '[]');

// Middleware
app.use(cors());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static('public')); // Votre index.html

// Stockage multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// === API Routes ===

// GET /api/tracks - Liste toutes les musiques
app.get('/api/tracks', (req, res) => {
  fs.readFile(TRACKS_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Erreur');
    res.json(JSON.parse(data));
  });
});

// POST /api/admin/add - Ajouter une musique (admin)
app.post('/api/admin/add', upload.single('audio'), (req, res) => {
  const { title, artist } = req.body;
  const file = req.file;

  if (!file || !title) {
    return res.status(400).json({ error: 'Fichier ou titre manquant' });
  }

  const newTrack = {
    id: Date.now(),
    title: title,
    artist: artist || 'Inconnu',
    fileURL: `/uploads/${file.filename}`,
    cover: '/public/assets/default-cover.jpg',
    addedAt: new Date().toISOString()
  };

  // Lire et mettre à jour tracks.json
  fs.readFile(TRACKS_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Erreur lecture');

    const tracks = JSON.parse(data);
    tracks.unshift(newTrack);

    fs.writeFile(TRACKS_FILE, JSON.stringify(tracks, null, 2), (err) => {
      if (err) return res.status(500).send('Erreur écriture');
      res.json(newTrack);
    });
  });
});

// DELETE /api/admin/delete/:id - Supprimer une musique
app.delete('/api/admin/delete/:id', (req, res) => {
  const id = parseInt(req.params.id);

  fs.readFile(TRACKS_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Erreur');
    let tracks = JSON.parse(data);
    const track = tracks.find(t => t.id === id);
    if (!track) return res.status(404).send('Non trouvé');

    // Supprimer le fichier
    const filePath = path.join(__dirname, track.fileURL);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    tracks = tracks.filter(t => t.id !== id);
    fs.writeFile(TRACKS_FILE, JSON.stringify(tracks, null, 2), () => {
      res.json({ success: true });
    });
  });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🎧 ParisZik Server en ligne sur http://localhost:${PORT}`);
});