const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    url: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['operational', 'degraded', 'down'],
        default: 'operational'
    },
    responseTime: {
        type: Number,
        default: 0
    },
    uptime: {
        type: Number,
        default: 100
    },
    lastChecked: {
        type: Date,
        default: Date.now
    },
    incidents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Incident'
    }]
});

module.exports = mongoose.model('Site', siteSchema);