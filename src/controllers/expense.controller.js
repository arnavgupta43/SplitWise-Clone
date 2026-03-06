import * as Yup from "yup";
import Expense from "../models/expense";
import ExpenseParticipant from "../models/expense-participant";
import User from "../models/user";
import { BadRequestError, ForbiddenError, NotFoundError, ValidationError } from "../utils/ApiError";

let expenseController = {
  createExpense: async (req, res, next) => {
    try {
      const schema = Yup.object().shape({
        name: Yup.string().trim().required("Name is required"),
        total_amount: Yup.number()
          .positive("Amount must be positive")
          .required("Amount is required"),
        currency: Yup.string()
          .oneOf(["INR", "USD"], "Unsupported currency")
          .required("Currency is required"),
        expense_date: Yup.date().required("Date is required"),
        members: Yup.array()
          .of(Yup.number().integer().positive())
          .min(1, "At least one member is required")
          .required("Members are required"),
        description: Yup.string().trim(),
      });

      if (!(await schema.isValid(req.body))) throw new ValidationError();

      const { name, total_amount, currency, expense_date, members, description } = req.body;

      // Make sure creator is included in members, remove duplicates
      const uniqueMembers = [...new Set([...members, Number(req.userId)])];

      // Verify all member user IDs actually exist
      const users = await User.findAll({ where: { id: uniqueMembers } });
      if (users.length !== uniqueMembers.length) {
        throw new BadRequestError("One or more members not found");
      }

      const expense = await Expense.create({
        created_by: req.userId,
        name,
        description: description || null,
        total_amount,
        currency,
        expense_date,
        split_method: "EQUAL",
        status: "ACTIVE",
      });

      // Split equally among all members
      const share = (total_amount / uniqueMembers.length).toFixed(2);

      const participantData = uniqueMembers.map((userId) => ({
        expense_id: expense.id,
        user_id: userId,
        share_amount: share,
        paid_amount: userId == req.userId ? total_amount : 0,
      }));

      await ExpenseParticipant.bulkCreate(participantData);

      const result = await Expense.findOne({
        where: { id: expense.id },
        include: [
          {
            model: ExpenseParticipant,
            as: "participants",
            include: [{ model: User, as: "user", attributes: ["id", "name"] }],
          },
        ],
      });

      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  getExpenses: async (req, res, next) => {
    try {
      // Find all expenses the current user is part of
      const myParticipations = await ExpenseParticipant.findAll({
        where: { user_id: req.userId },
        attributes: ["expense_id"],
      });

      const expenseIds = myParticipations.map((p) => p.expense_id);

      if (expenseIds.length === 0) return res.status(200).json([]);

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

      return res.status(200).json(expenses);
    } catch (error) {
      next(error);
    }
  },

  getExpense: async (req, res, next) => {
    try {
      const expense = await Expense.findOne({
        where: { id: req.params.id, status: "ACTIVE" },
        include: [
          {
            model: ExpenseParticipant,
            as: "participants",
            include: [{ model: User, as: "user", attributes: ["id", "name"] }],
          },
        ],
      });

      if (!expense) throw new NotFoundError("Expense not found");

      // Check if current user is a participant
      const isParticipant = expense.participants.some((p) => p.user_id == req.userId);
      if (!isParticipant) throw new ForbiddenError();

      return res.status(200).json(expense);
    } catch (error) {
      next(error);
    }
  },

  updateExpense: async (req, res, next) => {
    try {
      const schema = Yup.object().shape({
        name: Yup.string().trim(),
        total_amount: Yup.number().positive("Amount must be positive"),
        currency: Yup.string().oneOf(["INR", "USD"], "Unsupported currency"),
        expense_date: Yup.date(),
        members: Yup.array().of(Yup.number().integer().positive()),
        description: Yup.string().trim(),
      });

      if (!(await schema.isValid(req.body))) throw new ValidationError();

      const expense = await Expense.findOne({
        where: { id: req.params.id, status: "ACTIVE" },
      });

      if (!expense) throw new NotFoundError("Expense not found");
      if (expense.created_by != req.userId) throw new ForbiddenError();

      const { name, total_amount, currency, expense_date, members, description } = req.body;

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (total_amount !== undefined) updates.total_amount = total_amount;
      if (currency !== undefined) updates.currency = currency;
      if (expense_date !== undefined) updates.expense_date = expense_date;
      if (description !== undefined) updates.description = description;

      await expense.update(updates);

      // If members list changed, recalculate participants and shares
      if (members !== undefined) {
        const uniqueMembers = [...new Set([...members, Number(req.userId)])];

        const users = await User.findAll({ where: { id: uniqueMembers } });
        if (users.length !== uniqueMembers.length) {
          throw new BadRequestError("One or more members not found");
        }

        const newAmount = total_amount !== undefined ? total_amount : Number(expense.total_amount);
        const share = (newAmount / uniqueMembers.length).toFixed(2);

        await ExpenseParticipant.destroy({ where: { expense_id: expense.id } });

        const participantData = uniqueMembers.map((userId) => ({
          expense_id: expense.id,
          user_id: userId,
          share_amount: share,
          paid_amount: userId == req.userId ? newAmount : 0,
        }));

        await ExpenseParticipant.bulkCreate(participantData);
      } else if (total_amount !== undefined) {
        // Just the amount changed — update everyone's share proportionally
        const currentParticipants = await ExpenseParticipant.findAll({
          where: { expense_id: expense.id },
        });
        const share = (total_amount / currentParticipants.length).toFixed(2);
        for (const p of currentParticipants) {
          const newPaid = p.user_id == req.userId ? total_amount : 0;
          await p.update({ share_amount: share, paid_amount: newPaid });
        }
      }

      const result = await Expense.findOne({
        where: { id: expense.id },
        include: [
          {
            model: ExpenseParticipant,
            as: "participants",
            include: [{ model: User, as: "user", attributes: ["id", "name"] }],
          },
        ],
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  deleteExpense: async (req, res, next) => {
    try {
      const expense = await Expense.findOne({
        where: { id: req.params.id, status: "ACTIVE" },
      });

      if (!expense) throw new NotFoundError("Expense not found");
      if (expense.created_by != req.userId) throw new ForbiddenError();

      await expense.update({ status: "DELETED" });

      return res.status(200).json({ message: "Expense deleted" });
    } catch (error) {
      next(error);
    }
  },
};

export default expenseController;
