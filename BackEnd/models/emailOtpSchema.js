const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const { Schema, model } = mongoose;

const emailOtpSchema = new Schema({
    email: {
        type: String,
        required: true,
        trim: true
    },
    otp: {
        type: String,
        required: true,
        trim: true
    },
    otpExpiryTime: {
        type: Date,
        required: true
    },
    name: {
        type: String,
        trim: true,
        default: ""
    },
    dateOfBirth: {
        type: String,
        trim: true,
        default: ""
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verifiedAt: {
        type: Date,
        default: null
    },
    lastSentAt: {
        type: Date,
        default: null
    },
    attempts: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    versionKey: false
});

emailOtpSchema.pre('save', async function(next) {
    if (this.isModified('otp')) {
        this.otp = await bcrypt.hash(this.otp.toString(), 11);
    }
});

emailOtpSchema.methods.compareOtp = async function(candidateOtp) {
    return await bcrypt.compare(candidateOtp.toString(), this.otp);
};

const emailOtpModel = model('emailOtp', emailOtpSchema);

module.exports = { emailOtpModel };