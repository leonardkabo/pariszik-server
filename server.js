// server.js
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

// === Upload via mémoire (multer) ===
const upload = multer({ storage: multer.memoryStorage() });

// === Liste des morceaux (sera remplie au démarrage) ===
let tracks = [];

// === Mot de passe admin haché (admin123) ===
const ADMIN_PASSWORD = 'admin123';
let ADMIN_PASSWORD_HASH;

// Hasher le mot de passe au démarrage
bcrypt.hash(ADMIN_PASSWORD, 10, (err, hash) => {
    if (err) {
        console.error('Erreur hachage mot de passe:', err);
    } else {
        ADMIN_PASSWORD_HASH = hash;
        console.log('✅ Mot de passe admin haché');
    }
});

// === 🔐 Route de login admin ===
app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ success: false, message: 'Mot de passe requis' });
    }

    try {
        const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
        if (isValid) {
            return res.json({ success: true });
        } else {
            return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
        }
    } catch (err) {
        console.error('Erreur login:', err);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// === GET /api/tracks - Liste des morceaux ===
app.get('/api/tracks', (req, res) => {
    res.json(tracks);
});

const { MEGA } = require('megajs');
const upload = multer({ storage: multer.memoryStorage() });

// Infos MEGA
const MEGA_EMAIL = 'leonardkabo32@gmail.com';
const MEGA_PASSWORD = 'pariszik@2025';

// Route : /api/admin/add-to-mega
app.post('/api/admin/add-to-mega', upload.fields([{ name: 'audio' }, { name: 'cover' }]), async (req, res) => {
    try {
        const { title, artist, genre } = req.body;
        const audioBuffer = req.files['audio'][0].buffer;
        const coverBuffer = req.files['cover'] ? req.files['cover'][0].buffer : null;

        // Connexion à MEGA
        const storage = new MEGA({ email: MEGA_EMAIL, password: MEGA_PASSWORD });
        await storage.login();

        // Upload audio
        const audioStream = require('stream').Readable.from(audioBuffer);
        const audioFile = await storage.upload({ name: req.files['audio'][0].originalname }, audioStream);
        const audioURL = audioFile.publicLink();

        // Upload cover (si présente)
        let coverURL = 'https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp';
        if (coverBuffer) {
            const coverStream = require('stream').Readable.from(coverBuffer);
            const coverFile = await storage.upload({ name: req.files['cover'][0].originalname }, coverStream);
            coverURL = coverFile.publicLink();
        }

        // Créer le nouveau morceau
        const newTrack = {
            id: Date.now(),
            title: title || 'Sans titre',
            artist: artist || 'Inconnu',
            genre: genre || 'Inconnu',
            fileURL: audioURL,
            cover: coverURL
        };

        // Ajouter à la liste locale
        tracks.unshift(newTrack);

        // Répondre au frontend
        res.json(newTrack);

    } catch (err) {
        console.error('Erreur upload MEGA:', err);
        res.status(500).json({ error: 'Upload échoué' });
    }
});


// === POST /api/admin/add - Upload vers Cloudinary ===
app.post('/api/admin/add', upload.fields([{ name: 'audio' }, { name: 'cover' }]), (req, res) => {
    const { title, artist, genre } = req.body;
    const audioFile = req.files['audio'][0];
    const coverFile = req.files['cover'] ? req.files['cover'][0] : null;

    // Stream vers Cloudinary
    const uploadAudioStream = cloudinary.uploader.upload_stream(
        { resource_type: 'video', folder: 'pariszik-audio' },
        (error, audioResult) => {
            if (error) {
                console.error('Upload audio échoué:', error);
                return res.status(500).json({ error: 'Upload audio échoué' });
            }

            let coverURL = 'https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp';

            if (coverFile) {
                const uploadCoverStream = cloudinary.uploader.upload_stream(
                    { resource_type: 'image', folder: 'pariszik-covers' },
                    (err, coverResult) => {
                        if (err) console.error('Upload cover échoué:', err);
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

// === DELETE /api/admin/delete/:id ===
app.delete('/api/admin/delete/:id', (req, res) => {
    const id = req.params.id;
    const lengthBefore = tracks.length;
    tracks = tracks.filter(t => t.id != id);
    if (tracks.length < lengthBefore) {
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Morceau non trouvé' });
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
    if (!playlist) {
        return res.status(404).json({ error: 'Playlist introuvable' });
    }
    const tracksInPlaylist = tracks.filter(t => playlist.trackIds.includes(t.id));
    res.json({ name: playlist.name, tracks: tracksInPlaylist });
});

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

// === Démarrage du serveur ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
    await loadTracksFromCloudinary(); // Charger les morceaux existants
});