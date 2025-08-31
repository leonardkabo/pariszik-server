const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const Track = require('./models/Track');

const app = express();

app.use(cors());
app.use(express.json());

// === Connexion à MongoDB ===
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/pariszik', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// === Upload ===
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/api/admin/add', upload.single('audio'), async (req, res) => {
    const { title, artist } = req.body;
    const file = req.file;
    // Ici, vous envoyez le fichier vers Cloudinary ou S3
    const newTrack = new Track({ title, artist, fileURL: 'https://exemple.com/audio.mp3' });
    await newTrack.save();
    res.json(newTrack);
});

app.get('/api/tracks', async (req, res) => {
    const tracks = await Track.find();
    res.json(tracks);
});

app.delete('/api/admin/delete/:id', async (req, res) => {
    await Track.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur lancé sur le port ${PORT}`);
});