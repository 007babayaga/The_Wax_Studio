const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const { Schema, model } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    dateOfBirth: {
        type: Date,
        required: function () {
            return this.authProvider === 'local';
        }
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: function () {
            return this.authProvider === 'local';
        }
    },
    googleId: {
        type: String,
        default: null
    },
    profilePicture: {
        type: String,
        default: ""
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    isVerified: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

userSchema.pre('save', async function () {
    if (!this.password || !this.isModified('password') || this._skipPasswordHash) return;
    this.password = await bcrypt.hash(this.password, 10);
});

const userModel = model('userSignUp', userSchema);

module.exports = { userModel };