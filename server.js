const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// === CORS : Autoriser Netlify et Railway ===
app.use(cors({
    origin: [
        'https://pariszik.netlify.app',
        'https://pariszik-server-production.up.railway.app',
        'http://localhost:5500'
    ],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// === Middleware ===
app.use(express.json());

// === Connexion à MongoDB ===
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/pariszik', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Connexion à MongoDB réussie');
}).catch(err => {
    console.error('❌ Échec connexion MongoDB:', err);
});

// === Routes ===
const trackRoutes = require('./routes/api/tracks');
const artistRoutes = require('./routes/api/artists');

app.use('/api', trackRoutes);
app.use('/api', artistRoutes);

// === Démarrage du serveur ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});