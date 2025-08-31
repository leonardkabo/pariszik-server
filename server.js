// pariszik-server/server.js
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// === CORS pour Netlify ===
app.use(cors({
    origin: ['https://pariszik.netlify.app', 'http://localhost:5500']
}));

// === Middleware ===
app.use(express.json());

// === Données en mémoire (pour test) ===
let tracks = [
    {
        id: 1,
        title: "Métro, boulot, dream",
        artist: "DJ Metro",
        fileURL: "https://res.cloudinary.com/demo/video/upload/v123/sample.mp3",
        cover: "https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp"
    },
    {
        id: 2,
        title: "Cité des anges",
        artist: "Zola",
        fileURL: "https://res.cloudinary.com/demo/video/upload/v123/sample2.mp3",
        cover: "https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp"
    }
];

// === Route API : liste des morceaux ===
app.get('/api/tracks', (req, res) => {
    res.json(tracks);
});

// === Route API : ajout de morceau (upload simulé) ===
app.post('/api/admin/add', (req, res) => {
    const { title = "Sans titre", artist = "Inconnu" } = req.body;
    const newTrack = {
        id: Date.now(),
        title,
        artist,
        fileURL: "https://res.cloudinary.com/demo/video/upload/v123/uploaded.mp3",
        cover: "https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp"
    };
    tracks.push(newTrack);
    res.json(newTrack);
});

// === Route API : suppression ===
app.delete('/api/admin/delete/:id', (req, res) => {
    tracks = tracks.filter(t => t.id != req.params.id);
    res.json({ success: true });
});

// === Démarrage du serveur ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});