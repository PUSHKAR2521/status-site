const axios = require('axios');
const Site = require('../models/Site');
const Incident = require('../models/Incident');

const checkSite = async (site) => {
    try {
        const startTime = Date.now();
        const response = await axios.get(site.url, {
            timeout: 10000 // 10 seconds timeout
        });
        const responseTime = Date.now() - startTime;

        let status = 'operational';
        if (response.status !== 200) {
            status = 'degraded';
        }
        if (responseTime > 5000) { // If response time > 5 seconds
            status = 'degraded';
        }
        
        await Site.findByIdAndUpdate(site._id, {
            status,
            responseTime,
            lastChecked: new Date(),
            uptime: calculateUptime(site, status === 'operational')
        });

        // Create incident if status changed to non-operational
        if (status !== 'operational' && site.status === 'operational') {
            await createIncident(site._id, `Site performance degraded. Response time: ${responseTime}ms`);
        }

    } catch (error) {
        // Site is down or unreachable
        await Site.findByIdAndUpdate(site._id, {
            status: 'down',
            lastChecked: new Date(),
            uptime: calculateUptime(site, false)
        });
        
        // Create incident if site was previously up
        if (site.status !== 'down') {
            await createIncident(site._id, 'Site is unreachable');
        }
    }
};

const calculateUptime = (site, isUp) => {
    // Simple uptime calculation
    const totalChecks = site.totalChecks || 0;
    const successfulChecks = site.successfulChecks || 0;
    
    return (((isUp ? successfulChecks + 1 : successfulChecks) / (totalChecks + 1)) * 100).toFixed(2);
};

const createIncident = async (siteId, message) => {
    const incident = new Incident({
        site: siteId,
        message,
        status: 'investigating',
        startTime: new Date()
    });
    await incident.save();
    
    await Site.findByIdAndUpdate(siteId, {
        $push: { incidents: incident._id }
    });
};

const checkAllSites = async () => {
    const sites = await Site.find();
    console.log(`Checking ${sites.length} sites...`);
    
    for (const site of sites) {
        try {
            await checkSite(site);
            console.log(`Checked ${site.name}: ${site.status}`);
        } catch (error) {
            console.error(`Error checking ${site.name}:`, error.message);
        }
    }
};

module.exports = {
    checkSite,
    checkAllSites
};