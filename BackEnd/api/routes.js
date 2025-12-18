const express = require('express');
const { authRouter } = require('./v1/Auth/routes');

const apiRouter = express.Router();

apiRouter.use('/auth',authRouter)

module.exports={apiRouter}