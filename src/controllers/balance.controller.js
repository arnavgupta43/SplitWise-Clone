import Expense from "../models/expense";
import ExpenseParticipant from "../models/expense-participant";
import User from "../models/user";

const balanceController = {
  getBalances: async (req, res, next) => {
    try {
      const myParticipations = await ExpenseParticipant.findAll({
        where: { user_id: req.userId },
        attributes: ["expense_id"],
      });

      const expenseIds = myParticipations.map((p) => p.expense_id);

      if (expenseIds.length === 0)
        return res.status(200).json({ balances: [] });

      const expenses = await Expense.findAll({
        where: { id: expenseIds, status: "ACTIVE" },
        include: [
          {
            model: ExpenseParticipant,
            as: "participants",
            include: [{ model: User, as: "user", attributes: ["id", "name"] }],
          },
        ],
      });

      const balanceMap = {};

      for (const expense of expenses) {
        const { participants, currency } = expense;

        if (participants.length <= 1) continue;

        const me = participants.find((p) => p.user_id == req.userId);
        if (!me) continue;

        const payer = participants.find((p) => Number(p.paid_amount) > 0);
        if (!payer) continue;

        if (payer.user_id == req.userId) {
          for (const other of participants) {
            if (other.user_id == req.userId) continue;
            const key = `${other.user_id}_${currency}`;
            if (!balanceMap[key]) {
              balanceMap[key] = { user: other.user, currency, net: 0 };
            }
            balanceMap[key].net += Number(other.share_amount);
          }
        } else {
          const key = `${payer.user_id}_${currency}`;
          if (!balanceMap[key]) {
            balanceMap[key] = { user: payer.user, currency, net: 0 };
          }
          balanceMap[key].net -= Number(me.share_amount);
        }
      }

      const balances = Object.values(balanceMap)
        .filter((b) => b.net !== 0)
        .map((b) => ({
          user_id: b.user.id,
          name: b.user.name,
          currency: b.currency,
          amount: Math.abs(b.net).toFixed(2),
          type: b.net > 0 ? "credit" : "debit",
        }));

      return res.status(200).json({ balances });
    } catch (error) {
      next(error);
    }
  },
};

export default balanceController;
