require('dotenv').config();
const cookieParser = require('cookie-parser');
const express = require('express');
const morgan = require('morgan');
const cors = require("cors");
const rateLimit = require('express-rate-limit');

const { apiRouter } = require('./api/routes');
const { connectDB } = require('./config/db');

// Fail fast: without these, every login or token check would fail at runtime.
const REQUIRED_ENV = ['MONGO_DB_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'PORT_NUMBER'];
const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
    console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
}

const isProd = process.env.NODE_ENV === 'production';

// Comma-separated list of frontend URLs allowed to call the API with cookies,
// e.g. CLIENT_ORIGINS=https://thewaxstudio.com,https://www.thewaxstudio.com
const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const app = express();

app.set('trust proxy', 1);

const tooManyRequests = (message) => ({ isSuccess: false, message });

const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooManyRequests("Too many requests, please try again later.")
});

// Endpoints that check a password or OTP: few tries per IP, so they can't be
// brute-forced. Successful logins don't count against the limit.
const credentialLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: tooManyRequests("Too many attempts. Please wait 15 minutes and try again.")
});

// Sending OTP emails costs money and can be used to spam an inbox.
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooManyRequests("Too many OTP requests. Please try again later.")
});

const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooManyRequests("Too many admin requests, please slow down.")
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(morgan(isProd ? 'combined' : 'dev'));

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));

app.use('/api/v1/auth', authLimiter);
app.use(
    [
        '/api/v1/auth/userLogin',
        '/api/v1/auth/resetPassword',
        '/api/v1/auth/deleteAccount',
        '/api/v1/otp/verifyEmailOtp',
    ],
    credentialLimiter
);
app.use(
    ['/api/v1/otp', '/api/v1/auth/forgotPassword'],
    otpLimiter
);
app.use('/api/v1/admin', adminLimiter);

app.use('/api/v1', apiRouter);

app.get("/", (req, res) => {
    res.status(200).json({
        isSuccess: true,
        message: "Server is Running Fine"
    });
});

// Only accept requests once the database is reachable.
connectDB()
    .then(() => {
        app.listen(process.env.PORT_NUMBER, () => {
            console.log("------------------Server Started✅--------------");
        });
    })
    .catch((err) => {
        console.error("-----------------Error in Database Connection❌---------", err.message);
        process.exit(1);
    });
