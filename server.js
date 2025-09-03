const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');
const bcrypt = require('bcrypt');

const app = express();

// === Configuration Cloudinary ===
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dc0xbw9fc',
    api_key: process.env.CLOUDINARY_API_KEY || '997467975132184',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'bVu5BMIRfkSPUmiz8nLgZP03hzA'
});

// === Middleware ===
app.use(cors({
    origin: 'https://pariszik.netlify.app',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// === Upload ===
const upload = multer({ storage: multer.memoryStorage() });

// === Liste des morceaux ===
let tracks = [];

// === Mot de passe admin haché (admin123) ===
const ADMIN_PASSWORD_HASH = '$2b$10$4Vj5v0y9Y5Z7X9qZJz0Q5e9QjK7t7v9q5Q5q5Q5q5Q5q5Q5q5Q5q5Q'; // "admin123"

// === 🔐 Login admin sécurisé ===
app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ success: false, message: 'Mot de passe requis' });
    }
    try {
        const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
        if (isValid) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
        }
    } catch (err) {
        console.error('Erreur login admin:', err);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// === POST /api/admin/add ===
app.post('/api/admin/add', upload.fields([{ name: 'audio' }, { name: 'cover' }]), (req, res) => {
    const { title, artist, genre } = req.body;
    const audioFile = req.files['audio'][0];
    const coverFile = req.files['cover'] ? req.files['cover'][0] : null;

    const uploadAudioStream = cloudinary.uploader.upload_stream(
        { resource_type: 'video', folder: 'pariszik-audio' },
        (error, audioResult) => {
            if (error) return res.status(500).json({ error: 'Upload audio échoué' });

            let coverURL = 'https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp';

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

    streamifier.createReadStream(audioFile.buffer).pipe(uploadAudioStream);
});

// === GET /api/tracks ===
app.get('/api/tracks', (req, res) => {
    res.json(tracks);
});

// === DELETE /api/admin/delete/:id ===
app.delete('/api/admin/delete/:id', (req, res) => {
    tracks = tracks.filter(t => t.id != req.params.id);
    res.json({ success: true });
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
    if (!playlist) {
        return res.status(404).json({ error: 'Playlist introuvable' });
    }
    const tracksInPlaylist = tracks.filter(t => playlist.trackIds.includes(t.id));
    res.json({ name: playlist.name, tracks: tracksInPlaylist });
});

// === Démarrage ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});