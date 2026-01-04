const express = require('express');
const { validateUserSignUp } = require('./dto');
const { userSignUpController } = require('./controllers');

const authRouter = express.Router();

authRouter.post('/signUp',validateUserSignUp,userSignUpController)

module.exports={authRouter}