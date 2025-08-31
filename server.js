// server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');

const app = express();

// === Configuration Cloudinary avec VOS clés ===
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

app.use(express.json());

// === Upload en mémoire ===
const upload = multer({ storage: multer.memoryStorage() });

// === Liste des morceaux (en mémoire) ===
let tracks = [
    {
        id: 1,
        title: "Métro, boulot, dream",
        artist: "DJ Metro",
        fileURL: "https://res.cloudinary.com/demo/video/upload/v123/sample.mp3",
        cover: "https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp"
    }
];

// === POST /api/admin/add - Upload vers Cloudinary ===
app.post('/api/admin/add', upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const { title = 'Sans titre', artist = 'Inconnu' } = req.body;

    // Upload du fichier audio vers Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
        {
            resource_type: 'video',
            folder: 'pariszik-audio'
        },
        (error, result) => {
            if (error) {
                console.error('Erreur Cloudinary:', error);
                return res.status(500).json({ error: 'Échec upload Cloudinary' });
            }

            const newTrack = {
                id: Date.now(),
                title,
                artist,
                fileURL: result.secure_url,
                cover: `https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp`
            };

            tracks.push(newTrack);
            console.log('✅ Morceau ajouté:', newTrack);
            res.json(newTrack);
        }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
});

// === GET /api/tracks - Retourne tous les morceaux ===
app.get('/api/tracks', (req, res) => {
    res.json(tracks);
});

// === DELETE /api/admin/delete/:id - Supprime un morceau ===
app.delete('/api/admin/delete/:id', (req, res) => {
    const id = parseInt(req.params.id);
    tracks = tracks.filter(t => t.id != id);
    res.json({ success: true });
});

// === Démarrage du serveur ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
    console.log(`🔗 Accédez à l'API: https://pariszik-server-production.up.railway.app/api/tracks`);
});