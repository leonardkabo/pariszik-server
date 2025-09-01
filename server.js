// server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');

const app = express();

// === Configuration Cloudinary ===
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dc0xbw9fc',
    api_key: process.env.CLOUDINARY_API_KEY || '997467975132184',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'bVu5BMIRfkSPUmiz8nLgZP03hzA'
});

// === CORS pour Netlify ===
app.use(cors({
    origin: 'https://pariszik.netlify.app',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

// === Middleware ===
app.use(express.json());

// === Upload en mémoire (via multer) ===
const upload = multer({ storage: multer.memoryStorage() });

// === Stockage en mémoire des morceaux ===
let tracks = [
    {
        id: 1,
        title: "Métro, boulot, dream",
        artist: "DJ Metro",
        genre: "Rap",
        fileURL: "https://res.cloudinary.com/demo/video/upload/v123/sample.mp3",
        cover: "https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp"
    }
];

// === 🔐 Route de login admin ===
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === 'admin123') {
        return res.json({ success: true });
    } else {
        return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
    }
});

// === GET /api/tracks - Liste des morceaux ===
app.get('/api/tracks', (req, res) => {
    res.json(tracks);
});

// === POST /api/admin/add - Upload audio + cover vers Cloudinary ===
app.post('/api/admin/add', upload.fields([{ name: 'audio' }, { name: 'cover' }]), (req, res) => {
    const { title, artist, genre } = req.body;
    const audioFile = req.files['audio'][0];
    const coverFile = req.files['cover'] ? req.files['cover'][0] : null;

    // Upload audio vers Cloudinary
    const uploadAudioStream = cloudinary.uploader.upload_stream(
        { resource_type: 'video', folder: 'pariszik-audio' },
        (error, audioResult) => {
            if (error) return res.status(500).json({ error: 'Échec upload audio' });

            let coverURL = 'https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp';

            // Si une cover est fournie, upload vers Cloudinary
            if (coverFile) {
                const uploadCoverStream = cloudinary.uploader.upload_stream(
                    { resource_type: 'image', folder: 'pariszik-covers' },
                    (err, coverResult) => {
                        if (err) console.error('Cover upload failed:', err);
                        coverURL = coverResult?.secure_url || coverURL;
                        saveTrack(audioResult, coverURL);
                    }
                );
                streamifier.createReadStream(coverFile.buffer).pipe(uploadCoverStream);
            } else {
                saveTrack(audioResult, coverURL);
            }
        }
    );

    // Fonction pour sauvegarder le morceau
    function saveTrack(audioResult, coverURL) {
        const newTrack = {
            id: Date.now(),
            title: title || 'Sans titre',
            artist: artist || 'Inconnu',
            genre: genre || 'Inconnu',
            fileURL: audioResult.secure_url,
            cover: coverURL
        };

        tracks.unshift(newTrack);
        res.json(newTrack);
    }

    // Commence l'upload du fichier audio
    streamifier.createReadStream(audioFile.buffer).pipe(uploadAudioStream);
});

// === DELETE /api/admin/delete/:id - Supprime un morceau ===
app.delete('/api/admin/delete/:id', (req, res) => {
    const id = parseInt(req.params.id);
    tracks = tracks.filter(t => t.id !== id);
    res.json({ success: true });
});

// === Démarrage du serveur ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
    console.log(`🔗 API disponible : https://pariszik-server-production.up.railway.app`);
});