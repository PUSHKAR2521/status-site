const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
    site: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Site',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['scheduled', 'in-progress', 'completed'],
        default: 'scheduled'
    }
});

module.exports = mongoose.model('Maintenance', maintenanceSchema);