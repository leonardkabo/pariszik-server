const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');

const app = express();

// === Cloudinary ===
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dc0xbw9fc',
    api_key: process.env.CLOUDINARY_API_KEY || '997467975132184',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'bVu5BMIRfkSPUmiz8nLgZP03hzA'
});

// === Middleware ===
app.use(cors({ origin: 'https://pariszik.netlify.app' }));
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// === Données en mémoire ===
let tracks = [];
let playlists = [];

// === Charger les morceaux existants depuis Cloudinary ===
async function loadExistingTracks() {
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
            fileURL: file.secure_url,
            cover: 'https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp'
        }));
        console.log(`✅ ${tracks.length} morceaux chargés`);
    } catch (err) {
        console.error('Erreur:', err);
    }
}

// === Routes ===
app.get('/api/tracks', (req, res) => res.json(tracks));

app.post('/api/admin/add', upload.fields([{ name: 'audio' }, { name: 'cover' }]), (req, res) => {
    const { title, artist } = req.body;
    const audioFile = req.files['audio'][0];

    const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'video', folder: 'pariszik-audio' },
        (error, result) => {
            if (error) return res.status(500).send('Erreur');
            const newTrack = {
                id: Date.now(),
                title: title || 'Sans titre',
                artist: artist || 'Inconnu',
                fileURL: result.secure_url,
                cover: 'https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp'
            };
            tracks.unshift(newTrack);
            res.json(newTrack);
        }
    );
    streamifier.createReadStream(audioFile.buffer).pipe(stream);
});

app.delete('/api/admin/delete/:id', (req, res) => {
    tracks = tracks.filter(t => t.id != req.params.id);
    res.json({ success: true });
});

// === Playlists partagées ===
app.post('/api/playlists/share', (req, res) => {
    playlists.push(req.body);
    res.json({ success: true });
});

app.get('/api/playlists/share/:id', (req, res) => {
    const pl = playlists.find(p => p.id === req.params.id);
    res.json(pl || { error: 'Not found' });
});


// === Démarrage ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
    await loadExistingTracks();
});