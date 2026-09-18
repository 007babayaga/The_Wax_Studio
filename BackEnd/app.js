require('dotenv').config();
const cookieParser = require('cookie-parser');
const express = require('express');
const morgan = require('morgan');
const cors = require("cors");
const rateLimit = require('express-rate-limit');

const { apiRouter } = require('./api/routes');

const app = express();

app.set('trust proxy', 1);

require("./config/db");

const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        isSuccess: false,
        message: "Too many requests, please try again later."
    }
});

const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        isSuccess: false,
        message: "Too many admin requests, please slow down."
    }
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));

app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/admin', adminLimiter);

app.use('/api/v1', apiRouter);

app.get("/", (req, res) => {
    res.status(200).json({
        isSuccess: true,
        message: "Server is Running Fine"
    });
});

app.listen(process.env.PORT_NUMBER, () => {
    console.log("------------------Server Started✅--------------");
});
