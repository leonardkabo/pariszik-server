const express = require('express');
const router = express.Router();

// Modèle temporaire (en attendant MongoDB)
let tracks = [
    {
        id: 1,
        title: "Métro, boulot, dream",
        artist: "DJ Metro",
        fileURL: "https://res.cloudinary.com/demo/video/upload/v123/sample.mp3",
        cover: "https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp"
    }
];

// GET /api/tracks
router.get('/tracks', (req, res) => {
    res.json(tracks);
});

// POST /api/admin/add (upload)
router.post('/admin/add', (req, res) => {
    const track = {
        id: Date.now(),
        title: req.body.title || 'Sans titre',
        artist: req.body.artist || 'Inconnu',
        fileURL: 'https://res.cloudinary.com/demo/video/upload/v123/fake.mp3',
        cover: 'https://raw.githubusercontent.com/leonardkabo/pariszik-web/main/assets/default-cover.webp'
    };
    tracks.push(track);
    res.json(track);
});

// DELETE /api/admin/delete/:id
router.delete('/admin/delete/:id', (req, res) => {
    tracks = tracks.filter(t => t.id != req.params.id);
    res.json({ success: true });
});

module.exports = router;