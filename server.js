// server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Mega } = require('mega');

const app = express();

// === Configuration MEGA ===
const MEGA_EMAIL = 'leonardkabo32@gmail.com';
const MEGA_PASSWORD = 'pariszik@2025';

// === Middleware ===
app.use(cors());
app.use(express.json());

// === Upload via mémoire ===
const upload = multer({ storage: multer.memoryStorage() });

// === Liste des morceaux ===
let tracks = [];

// === Connexion MEGA (globale) ===
const mega = new Mega({
    email: MEGA_EMAIL,
    password: MEGA_PASSWORD
});

// Attendre que MEGA soit prêt
app.use(async (req, res, next) => {
    if (!mega.isReady) {
        try {
            await mega.login();
            console.log('✅ Connecté à MEGA');
        } catch (err) {
            console.error('❌ Échec connexion MEGA:', err);
        }
    }
    next();
});

// === Route : Liste des morceaux ===
app.get('/api/tracks', (req, res) => {
    res.json(tracks);
});

// === Route : Upload vers MEGA ===
app.post('/api/admin/add-to-mega', upload.fields([{ name: 'audio' }, { name: 'cover' }]), async (req, res) => {
    try {
        const { title, artist, genre } = req.body;
        const audioBuffer = req.files['audio'][0].buffer;
        const coverBuffer = req.files['cover'] ? req.files['cover'][0].buffer : null;

        // Upload audio
        const audioFilename = req.files['audio'][0].originalname;
        const audioNode = await mega.upload(audioBuffer, audioFilename);
        const audioLink = await audioNode.link();
        const audioURL = audioLink.toString();

        // Upload cover
        let coverURL = 'https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp';
        if (coverBuffer) {
            const coverFilename = req.files['cover'][0].originalname;
            const coverNode = await mega.upload(coverBuffer, coverFilename);
            const coverLink = await coverNode.link();
            coverURL = coverLink.toString();
        }

        // Créer le morceau
        const newTrack = {
            id: Date.now(),
            title: title || audioFilename.replace('.mp3', '').split('-')[0] || 'Sans titre',
            artist: artist || audioFilename.replace('.mp3', '').split('-')[1] || 'Inconnu',
            genre: genre || 'Inconnu',
            fileURL: audioURL,
            cover: coverURL
        };

        tracks.unshift(newTrack);
        res.json(newTrack);

    } catch (err) {
        console.error('❌ Erreur upload MEGA:', err);
        res.status(500).json({ error: 'Upload échoué', details: err.message });
    }
});

// === Routes admin, delete, playlists, etc. ===
// (identiques à avant)

// === Démarrage ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});