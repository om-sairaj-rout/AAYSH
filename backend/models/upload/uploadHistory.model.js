const mongoose = require('mongoose');

const UploadHistorySchema = new mongoose.Schema({

    fileName: {
        type: String,
        required: true,
    },

    totalRows: {
        type: Number,
        required: true,
    },

    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },

    uploadDate: {
        type: Date,
        default: Date.now,
    },

    isVisible: {
        type: Boolean,
        default: true,
    }

}, { timestamps: true });

module.exports = mongoose.model('UploadHistory', UploadHistorySchema);