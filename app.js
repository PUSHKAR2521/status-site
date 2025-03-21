require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const path = require('path');
const Site = require('./models/Site');
const Incident = require('./models/Incident');
const monitoringService = require('./services/monitoring');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/status-site').then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Main dashboard route
app.get('/', async (req, res) => {
    try {
        const sites = await Site.find().sort({ name: 1 });
        const incidents = await Incident.find()
            .populate('site')
            .sort({ startTime: -1 })
            .limit(10);
        
        res.render('dashboard', { sites, incidents });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('Server error');
    }
});

// API route to add a new site
app.post('/api/sites', async (req, res) => {
    try {
        const { name, url } = req.body;
        const site = new Site({ name, url });
        await site.save();
        res.status(201).json(site);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Schedule monitoring checks every 5 minutes
cron.schedule('*/1 * * * *', async () => {
    console.log('Running site status checks...');
    try {
        await monitoringService.checkAllSites();
        console.log('Status checks completed');
    } catch (error) {
        console.error('Error during status checks:', error);
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});