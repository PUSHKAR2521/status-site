require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const path = require('path');
const Site = require('./models/Site');
const Incident = require('./models/Incident');
const Maintenance = require('./models/Maintenance');
const monitoringService = require('./services/monitoring');
const adminAuth = require('./middleware/auth');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cookieParser());

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

        // Filter out incidents with null sites
        const validIncidents = incidents.filter(incident => incident.site);
        
        const maintenances = await Maintenance.find({
            endTime: { $gte: new Date() }
        })
            .populate('site')
            .sort({ startTime: 1 });
        
        res.render('dashboard', { 
            sites, 
            incidents: validIncidents, 
            maintenances 
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('Server error');
    }
});

// API route to add a new site
app.post('/api/sites', adminAuth, async (req, res) => {
    try {
        const { name, url } = req.body;
        const site = new Site({ name, url });
        await site.save();
        res.status(201).json(site);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// API route to delete a site
app.delete('/api/sites/:id', adminAuth, async (req, res) => {
    try {
        await Site.findByIdAndDelete(req.params.id);
        res.json({ success: true });
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

// Login page route - update this route
app.get('/login', (req, res) => {
    const token = req.cookies.adminToken || req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            return res.redirect('/admin');
        } catch (error) {
            res.clearCookie('adminToken');
        }
    }
    res.render('admin-login');
});

// Admin dashboard route - update this route
app.get('/admin', async (req, res) => {
    const token = req.cookies.adminToken || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.redirect('/login');
    }
    
    try {
        jwt.verify(token, process.env.JWT_SECRET);
        const sites = await Site.find().sort({ name: 1 });
        const maintenances = await Maintenance.find()
            .populate('site')
            .sort({ startTime: 1 });
        
        res.render('admin', { sites, maintenances });
    } catch (error) {
        res.clearCookie('adminToken');
        res.redirect('/login');
    }
});

// Protect admin routes
// Move these to the top with other middleware
app.use(cookieParser());
app.use(express.json());
app.use('/admin', adminAuth);
app.use('/api/maintenance', adminAuth);

// Login page route (keep only this one)
app.get('/login', (req, res) => {
    const token = req.cookies.adminToken || req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            return res.redirect('/admin');
        } catch (error) {
            res.clearCookie('adminToken');
        }
    }
    res.render('admin-login');
});

// Admin dashboard route (keep only this one)
app.get('/admin', async (req, res) => {
    try {
        const sites = await Site.find().sort({ name: 1 });
        const maintenances = await Maintenance.find()
            .populate('site')
            .sort({ startTime: 1 });
        
        res.render('admin', { sites, maintenances });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).send('Server error');
    }
});

// Add this after other admin routes
app.get('/admin/sites', adminAuth, async (req, res) => {
    try {
        const sites = await Site.find().sort({ name: 1 });
        res.render('admin-sites', { sites });
    } catch (error) {
        console.error('Sites management error:', error);
        res.status(500).send('Server error');
    }
});

// Admin login route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.cookie('adminToken', token, { httpOnly: true });
        res.json({ 
            success: true,
            redirect: '/admin'
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Add this route before the maintenance routes
app.post('/api/logout', (req, res) => {
    res.clearCookie('adminToken');
    res.json({ success: true, redirect: '/login' });
});

// API route to add maintenance - update this route
app.post('/api/maintenance', adminAuth, async (req, res) => {
    try {
        const { siteId, title, description, startTime, endTime } = req.body;
        const maintenance = new Maintenance({
            site: siteId,
            title,
            description,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            status: 'scheduled' // Add default status
        });
        await maintenance.save();
        const populatedMaintenance = await maintenance.populate('site');
        res.status(201).json(populatedMaintenance);
    } catch (error) {
        console.error('Maintenance creation error:', error);
        res.status(400).json({ error: error.message });
    }
});

// API route to update maintenance status - update this route
app.put('/api/maintenance/:id', adminAuth, async (req, res) => {
    try {
        const maintenance = await Maintenance.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        ).populate('site');
        res.json(maintenance);
    } catch (error) {
        console.error('Status update error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Add this with your other maintenance routes
app.delete('/api/maintenance/:id', adminAuth, async (req, res) => {
    try {
        await Maintenance.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
