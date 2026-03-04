import { Router } from "express";
import expenseController from "../controllers/expense.controller";
import authMiddleware from "../middlewares/auth.middleware";

const expenseRoutes = Router();

expenseRoutes.post("/expenses", authMiddleware, expenseController.createExpense);
expenseRoutes.get("/expenses", authMiddleware, expenseController.getExpenses);
expenseRoutes.get("/expenses/:id", authMiddleware, expenseController.getExpense);
expenseRoutes.put("/expenses/:id", authMiddleware, expenseController.updateExpense);
expenseRoutes.delete("/expenses/:id", authMiddleware, expenseController.deleteExpense);

export { expenseRoutes };
