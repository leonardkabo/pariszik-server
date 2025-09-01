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

// === CORS ===
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

// === Charger les morceaux existants depuis Cloudinary au démarrage ===
async function loadTracksFromCloudinary() {
    try {
        const result = await cloudinary.api.resources({
            type: 'upload',
            resource_type: 'video',
            prefix: 'pariszik-audio',
            max_results: 100
        });

        tracks = result.resources.map(file => ({
            id: file.asset_id,
            title: file.original_filename.replace('.mp3', '').split('-')[0] || 'Sans titre',
            artist: file.original_filename.replace('.mp3', '').split('-')[1] || 'Inconnu',
            genre: 'Inconnu',
            fileURL: file.secure_url,
            cover: 'https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp'
        }));

        console.log(`✅ ${tracks.length} morceaux chargés depuis Cloudinary`);
    } catch (err) {
        console.error('Erreur chargement Cloudinary:', err);
    }
}

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

// === Démarrage ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
    await loadTracksFromCloudinary(); // Charger les anciens morceaux
});