// routes/api/artists.js
const express = require('express');
const router = express.Router();
const Artist = require('../../models/Artist');

// GET /api/artists - Lister tous les artistes
router.get('/artists', async (req, res) => {
    try {
        const artists = await Artist.find();
        res.json(artists);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/artist/add - Ajouter un artiste
router.post('/admin/artist/add', async (req, res) => {
    try {
        const { name, genre, bio, image, cover } = req.body;
        const artist = new Artist({ name, genre, bio, image, cover });
        await artist.save();
        res.json(artist);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/admin/artist/delete/:id - Supprimer un artiste
router.delete('/admin/artist/delete/:id', async (req, res) => {
    try {
        await Artist.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;