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

app.use(express.json());

// === Upload en mémoire ===
const upload = multer({ storage: multer.memoryStorage() });

// === Liste des morceaux (en mémoire) ===
let tracks = [];

// === 🔁 Chargement automatique des morceaux depuis Cloudinary au démarrage ===
async function loadTracksFromCloudinary() {
    try {
        // Récupérer tous les fichiers audio du dossier 'pariszik-audio'
        const audioResult = await cloudinary.api.resources({
            type: 'upload',
            resource_type: 'video',
            prefix: 'pariszik-audio',
            max_results: 100
        });

        // Récupérer toutes les covers du dossier 'pariszik-covers'
        const coverResult = await cloudinary.api.resources({
            type: 'upload',
            resource_type: 'image',
            prefix: 'pariszik-covers',
            max_results: 100
        });

        const coverMap = {};
        coverResult.resources.forEach(img => {
            const publicId = img.public_id.split('/').pop();
            coverMap[publicId] = img.secure_url;
        });

        tracks = audioResult.resources.map(file => {
            const publicId = file.public_id.split('/').pop();
            const baseName = publicId.replace(/\.[^/.]+$/, ""); // enlève l'extension

            // Extraire titre et artiste du nom de fichier (ex: "Titre - Artiste.mp3")
            let [title, artist] = baseName.split(' - ');
            if (!artist) {
                artist = 'Inconnu';
                title = baseName;
            }

            // Chercher une cover correspondante
            const coverKey = publicId.replace(/\.[^/.]+$/, ""); // même nom sans .mp3
            const cover = coverMap[coverKey] || 'https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp';

            return {
                id: file.asset_id,
                title: title || 'Sans titre',
                artist: artist || 'Inconnu',
                genre: 'Inconnu',
                fileURL: file.secure_url,
                cover: cover
            };
        });

        console.log(`✅ ${tracks.length} morceaux chargés depuis Cloudinary`);
    } catch (err) {
        console.error('Erreur chargement Cloudinary:', err);
    }
}

// === 🔐 Route de login admin ===
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === 'admin123') {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
    }
});

// === GET /api/tracks - Liste des morceaux ===
app.get('/api/tracks', (req, res) => {
    res.json(tracks);
});

// === POST /api/admin/add - Upload vers Cloudinary ===
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

// === PUT /api/admin/edit/:id - Modifier un morceau ===
app.put('/api/admin/edit/:id', upload.fields([{ name: 'cover' }]), (req, res) => {
    const { id } = req.params;
    const { title, artist, genre } = req.body;
    const coverFile = req.files?.cover ? req.files.cover[0] : null;

    const track = tracks.find(t => t.id == id);
    if (!track) return res.status(404).json({ error: 'Morceau non trouvé' });

    // Mettre à jour les champs
    if (title) track.title = title;
    if (artist) track.artist = artist;
    if (genre) track.genre = genre;

    // Si nouvelle cover, upload vers Cloudinary
    if (coverFile) {
        const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: 'image', folder: 'pariszik-covers' },
            (err, result) => {
                if (err) return res.status(500).json({ error: 'Échec upload cover' });
                track.cover = result.secure_url;
                res.json(track);
            }
        );
        streamifier.createReadStream(coverFile.buffer).pipe(uploadStream);
    } else {
        res.json(track);
    }
});

// === DELETE /api/admin/delete/:id ===
app.delete('/api/admin/delete/:id', (req, res) => {
    tracks = tracks.filter(t => t.id != req.params.id);
    res.json({ success: true });
});

// === Démarrage du serveur ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
    await loadTracksFromCloudinary(); // Charger les morceaux existants
});