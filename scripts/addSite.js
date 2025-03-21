require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const Site = require('../models/Site');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/status-site', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function addSite() {
    try {
        console.log('\n=== Add New Site for Monitoring ===\n');

        const name = await question('Enter site name (e.g., My Website): ');
        const url = await question('Enter site URL (e.g., https://example.com): ');

        const site = new Site({
            name,
            url,
            status: 'operational',
            lastChecked: new Date()
        });

        await site.save();
        console.log('\n✅ Site added successfully!\n');
        console.log('Site details:');
        console.log('-------------');
        console.log(`Name: ${site.name}`);
        console.log(`URL: ${site.url}`);
        console.log(`Status: ${site.status}`);

    } catch (error) {
        console.error('\n❌ Error adding site:', error.message);
    } finally {
        rl.close();
        mongoose.connection.close();
    }
}

addSite();