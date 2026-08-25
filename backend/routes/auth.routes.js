const express = require("express");
const authRouter = express.Router();

const RegisterController = require("../controllers/authControllers/userRegister.controllers.js");
const LoginController = require("../controllers/authControllers/userLogin.controllers.js");
const ExternalLoginController = require("../controllers/authControllers/userExternalLogin.controllers.js");
const ExternalLogoutController = require("../controllers/authControllers/userExternalLogout.controllers.js");
const LogoutController = require("../controllers/authControllers/userLogout.controllers.js");
const authCheckController = require("../controllers/authControllers/authCheck.controllers.js");
const {
  checkAuth,
  checkPermission,
  requireUnrestrictedAdmin,
} = require("../middlewares/auth.middleware.js");
const forgotPassword = require("../controllers/authControllers/forgotPassword.controllers.js");
const resetPassword = require("../controllers/authControllers/resetPassword.controllers.js");
const getAllUsers = require("../controllers/authControllers/getAllUsers.controllers");
const getRegistrationStats = require("../controllers/authControllers/getRegistrationStats.controllers");
const {
  migrateLegacyCompaniesController,
} = require("../controllers/authControllers/migrateLegacyCompanies.controllers");

const updateUserController = require("../controllers/authControllers/updateUser.controllers");
const deleteUserController = require("../controllers/authControllers/deleteUser.controllers");

authRouter.post("/user/register", RegisterController);
authRouter.post("/user/login", LoginController);
authRouter.post("/user/external/login", ExternalLoginController);
authRouter.post("/user/logout", LogoutController);
authRouter.post("/user/external/logout", ExternalLogoutController);
authRouter.get("/auth/check", checkAuth, authCheckController);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password/:token", resetPassword);
authRouter.get(
  "/users",
  checkAuth,
  checkPermission("settings", "read"),
  getAllUsers
);
authRouter.get(
  "/users/registration-stats",
  checkAuth,
  checkPermission("companies", "read"),
  getRegistrationStats
);
authRouter.post(
  "/users/migrate-legacy-companies",
  checkAuth,
  requireUnrestrictedAdmin,
  migrateLegacyCompaniesController
);

authRouter.put(
  "/update-user/:id",
  checkAuth,
  checkPermission("settings", "write"),
  updateUserController,
);
authRouter.delete(
  "/delete-user/:id",
  checkAuth,
  checkPermission("settings", "write"),
  deleteUserController,
);

module.exports = authRouter;
