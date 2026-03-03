import { Router } from "express";
import userController from "../controllers/user.controller";
import authMiddleware from "../middlewares/auth.middleware";

const userRoutes = Router();

userRoutes.post("/register", userController.register);
userRoutes.get("/me", authMiddleware, userController.getProfile);
userRoutes.put("/me", authMiddleware, userController.updateProfile);
userRoutes.delete("/me", authMiddleware, userController.deleteAccount);

export { userRoutes };
