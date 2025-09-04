// server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Mega } = require('mega');

const app = express();

// === Identifiants MEGA (à remplacer par des variables d'environnement plus tard) ===
const MEGA_EMAIL = 'leonardkabo32@gmail.com';
const MEGA_PASSWORD = 'pariszik@2025';

// === Middleware ===
app.use(cors());
app.use(express.json());

// === Upload via mémoire ===
const upload = multer({ storage: multer.memoryStorage() });

// === Liste des morceaux (en mémoire) ===
let tracks = [];

// === Connexion MEGA ===
const mega = new Mega({ email: MEGA_EMAIL, password: MEGA_PASSWORD });

app.use(async (req, res, next) => {
    if (!mega.isReady) {
        try {
            await mega.login();
            console.log('✅ Connecté à MEGA');
        } catch (err) {
            console.error('❌ Échec connexion MEGA:', err);
            return res.status(500).json({ error: 'Échec connexion MEGA' });
        }
    }
    next();
});

// === Route : Liste des morceaux ===
app.get('/api/tracks', (req, res) => {
    res.json(tracks);
});

// === Route : Upload vers MEGA ===
app.post('/api/admin/add', upload.fields([{ name: 'audio' }, { name: 'cover' }]), async (req, res) => {
    try {
        const { title, artist, genre } = req.body;
        const audioBuffer = req.files['audio'][0].buffer;
        const coverBuffer = req.files['cover'] ? req.files['cover'][0].buffer : null;

        // Upload audio
        const audioNode = await mega.upload(audioBuffer, req.files['audio'][0].originalname);
        const audioLink = await audioNode.link();
        const audioURL = audioLink.toString();

        // Upload cover
        let coverURL = 'https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp';
        if (coverBuffer) {
            const coverNode = await mega.upload(coverBuffer, req.files['cover'][0].originalname);
            const coverLink = await coverNode.link();
            coverURL = coverLink.toString();
        }

        // Créer le morceau
        const newTrack = {
            id: Date.now(),
            title: title || 'Sans titre',
            artist: artist || 'Inconnu',
            genre: genre || 'Inconnu',
            fileURL: audioURL,
            cover: coverURL
        };

        tracks.unshift(newTrack);
        res.json(newTrack);

    } catch (err) {
        console.error('❌ Erreur upload MEGA:', err);
        res.status(500).json({ error: 'Upload échoué' });
    }
});

// === Supprimer morceau ===
app.delete('/api/admin/delete/:id', (req, res) => {
    tracks = tracks.filter(t => t.id != req.params.id);
    res.json({ success: true });
});

// === Login admin ===
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === 'admin123') {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
    }
});

// === Partage de playlist ===
let sharedPlaylists = [];

app.post('/api/playlists/share', (req, res) => {
    const { name, trackIds } = req.body;
    const shareId = Math.random().toString(36).substr(2, 9);
    sharedPlaylists.push({ id: shareId, name, trackIds });
    res.json({ success: true, shareId });
});

app.get('/api/playlists/share/:shareId', (req, res) => {
    const playlist = sharedPlaylists.find(p => p.id === req.params.shareId);
    if (!playlist) return res.status(404).json({ error: 'Playlist introuvable' });
    const tracksInPlaylist = tracks.filter(t => playlist.trackIds.includes(t.id));
    res.json({ name: playlist.name, tracks: tracksInPlaylist });
});

// === Démarrage ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});