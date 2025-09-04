// server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { MEGA } = require('megajs');
const fs = require('fs');
const path = require('path');

const app = express();

// === Configuration MEGA ===
const MEGA_EMAIL = 'leonardkabo32@gmail.com';
const MEGA_PASSWORD = 'pariszik@2025';

// === Middleware ===
app.use(cors({
    origin: 'https://pariszik.netlify.app',
    methods: ['GET', 'POST', 'DELETE']
}));

app.use(express.json());

// === Upload via mémoire ===
const upload = multer({ storage: multer.memoryStorage() });

// === Liste des morceaux (en mémoire) ===
let tracks = [];

// === Charger les morceaux au démarrage (optionnel) ===
// Vous pouvez sauvegarder cette liste dans un fichier JSON plus tard

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

        // Connexion à MEGA
        const storage = new MEGA({ email: MEGA_EMAIL, password: MEGA_PASSWORD });
        await storage.login();

        // Upload audio
        const audioFilename = req.files['audio'][0].originalname;
        const audioStream = require('stream').Readable.from(audioBuffer);
        const audioFile = await storage.upload({ name: audioFilename }, audioStream);
        const audioURL = audioFile.publicLink();

        // Upload cover
        let coverURL = 'https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp';
        if (coverBuffer) {
            const coverFilename = req.files['cover'][0].originalname;
            const coverStream = require('stream').Readable.from(coverBuffer);
            const coverFile = await storage.upload({ name: coverFilename }, coverStream);
            coverURL = coverFile.publicLink();
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

        // Ajouter à la liste
        tracks.unshift(newTrack);

        // Répondre au frontend
        res.json(newTrack);

    } catch (err) {
        console.error('❌ Erreur upload MEGA:', err);
        res.status(500).json({ error: 'Upload échoué', details: err.message });
    }
});

// === Route : Supprimer morceau (local) ===
app.delete('/api/admin/delete/:id', (req, res) => {
    const id = req.params.id;
    const lengthBefore = tracks.length;
    tracks = tracks.filter(t => t.id != id);
    if (tracks.length < lengthBefore) {
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Non trouvé' });
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

// === Login admin (sécurisé) ===
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === 'admin123') {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
    }
});

// === Démarrage ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});