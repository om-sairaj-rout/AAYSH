const express = require('express');
const authRouter = express.Router();

const RegisterController = require('../controllers/authControllers/userRegister.controllers.js');
const LoginController = require('../controllers/authControllers/userLogin.controllers.js');
const LogoutController = require('../controllers/authControllers/userLogout.controllers.js');
const authCheckController = require('../controllers/authControllers/authCheck.controllers.js');
const { checkAuth } = require('../middlewares/auth.middleware.js');

authRouter.post('/user/register', RegisterController);
authRouter.post('/user/login', LoginController);
authRouter.post('/user/logout', LogoutController);
authRouter.get('/auth/check', checkAuth, authCheckController);

module.exports = authRouter;