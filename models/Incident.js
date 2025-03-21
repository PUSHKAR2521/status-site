const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
    site: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Site',
        required: true
    },
    status: {
        type: String,
        enum: ['investigating', 'identified', 'monitoring', 'resolved'],
        default: 'investigating'
    },
    message: String,
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: Date,
    updates: [{
        message: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
});

module.exports = mongoose.model('Incident', incidentSchema);