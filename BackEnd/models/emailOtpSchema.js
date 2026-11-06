const mongoose = require('mongoose');

const { Schema, model } = mongoose;

// Sign-up and password-reset codes live in the same collection but must never
// be usable for each other, so every query filters on `purpose`.
const OTP_PURPOSES = Object.freeze({
    SIGNUP: 'signup',
    RESET: 'reset'
});

// Hashing and all writes are done in utils/otpService.js with atomic updates,
// so there is deliberately no pre('save') hook here.
const emailOtpSchema = new Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    purpose: {
        type: String,
        required: true,
        enum: Object.values(OTP_PURPOSES)
    },
    // bcrypt hash of the code, never the code itself
    otp: {
        type: String,
        required: true
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
    // sha256 of the random token handed to the browser (httpOnly cookie) that
    // verified this email; POST /auth/signUp must present it.
    signupTokenHash: {
        type: String,
        default: null
    },
    lastSentAt: {
        type: Date,
        default: null
    },
    // Start of the current send window and how many codes were sent in it.
    firstSentAt: {
        type: Date,
        default: null
    },
    sendCount: {
        type: Number,
        default: 0
    },
    attempts: {
        type: Number,
        default: 0
    },
    // MongoDB removes the record automatically once this time has passed.
    expiresAt: {
        type: Date,
        required: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// One live record per email and purpose. issueOtp() relies on this index to
// reject a second send that races past the cooldown check.
emailOtpSchema.index({ email: 1, purpose: 1 }, { unique: true });
emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const emailOtpModel = model('emailOtp', emailOtpSchema);

module.exports = { emailOtpModel, OTP_PURPOSES };
