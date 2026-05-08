const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({

    orderNumber: {
        type: String,
        required: true,
        trim: true,
    },

    awbNumber: {
        type: String,
        required: true,
        trim: true,
    },

    historyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UploadHistory',
        required: true,
        index: true,
    },

    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },

    customerName: {
        type: String,
        required: true,
        trim: true,
    },

    destinationCity: {
        type: String,
        required: true,
        index: true,
    },

    pincode: {
        type: String,
        required: true,
    },

    weight: {
        type: Number,
        required: true,
    },

    courierPartner: {
        type: String,
        required: true,
        enum: [
            'Delhivery',
            'Blue Dart',
            'Ecom Express',
            'XpressBees',
            'Shadowfax'
        ]
    },

    status: {
    type: String,
    trim: true,
    default: "Pending"
},

    orderDate: {
        type: Date,
        default: Date.now,
        index: true
    }

}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);