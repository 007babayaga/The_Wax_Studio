const express = require('express');
const { validateUserSignUp } = require('./dto');
const { userSignUpController, googleAuthController } = require('./controllers');

const authRouter = express.Router({ caseSensitive: true });

authRouter.post('/signUp', validateUserSignUp, userSignUpController);
authRouter.post('/google',googleAuthController);


module.exports={authRouter};