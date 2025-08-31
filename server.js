const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const artistRoutes = require('./routes/api/artists');

// === Cloudinary Configuration ===
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: 'dc0xbw9fc',
  api_key: '997467975132184',
  api_secret: 'bVu5BMIRfkSPUmiz8nLgZP03hzA'
});

const app = express();
const PORT = process.env.PORT || 3000;

// Dossiers
const DATA_DIR = path.join(__dirname, 'data');
const TRACKS_FILE = path.join(DATA_DIR, 'tracks.json');

// Créer data/ si besoin
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(TRACKS_FILE)) fs.writeFileSync(TRACKS_FILE, '[]');

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use('/api', artistRoutes);

// Route de santé
app.get('/', (req, res) => {
  res.json({ status: 'ParisZik Server en ligne ✅' });
});

// Stockage temporaire pour multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Créer le dossier uploads localement (temporaire)
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// === API Routes ===

// GET /api/tracks
app.get('/api/tracks', (req, res) => {
  fs.readFile(TRACKS_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Erreur lecture tracks.json' });
    res.json(JSON.parse(data));
  });
});

// POST /api/admin/add
app.post('/api/admin/add', upload.single('audio'), async (req, res) => {
  const { title, artist } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'Aucun fichier audio reçu' });
  if (!title) return res.status(400).json({ error: 'Titre manquant' });

  try {
    // Upload vers Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: 'video', // Fonctionne pour .mp3
      folder: 'pariszik-audios',
      format: 'mp3'
    });

    // Supprimer le fichier local après upload
    fs.unlinkSync(file.path);

    const newTrack = {
      id: Date.now(),
      title: title.trim(),
      artist: artist?.trim() || 'Inconnu',
      fileURL: result.secure_url, // URL permanente
      cover: '/public/assets/default-cover.jpg',
      addedAt: new Date().toISOString()
    };

    // Lire et mettre à jour tracks.json
    fs.readFile(TRACKS_FILE, 'utf8', (err, data) => {
      if (err) return res.status(500).json({ error: 'Erreur lecture tracks.json' });
      const tracks = JSON.parse(data || '[]');
      tracks.unshift(newTrack);
      fs.writeFile(TRACKS_FILE, JSON.stringify(tracks, null, 2), (err) => {
        if (err) return res.status(500).json({ error: 'Erreur écriture tracks.json' });
        res.json(newTrack);
      });
    });
  } catch (err) {
    console.error('Erreur Cloudinary:', err);
    return res.status(500).json({ error: 'Échec upload Cloudinary' });
  }
});

// DELETE /api/admin/delete/:id
app.delete('/api/admin/delete/:id', (req, res) => {
  const id = parseInt(req.params.id);
  fs.readFile(TRACKS_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Erreur lecture' });
    let tracks = JSON.parse(data);
    const track = tracks.find(t => t.id === id);
    if (!track) return res.status(404).json({ error: 'Non trouvé' });

    tracks = tracks.filter(t => t.id !== id);
    fs.writeFile(TRACKS_FILE, JSON.stringify(tracks, null, 2), () => {
      res.json({ success: true });
    });
  });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🎧 ParisZik Server en ligne sur http://localhost:${PORT}`);
  console.log(`📁 Dossier temporaire : uploads/`);
});

module.exports = app;