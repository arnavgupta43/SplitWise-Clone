import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware";
import balanceController from "../controllers/balance.controller";

const router = Router();
router.get("/balances", authMiddleware, balanceController.getBalances);
export default router;
