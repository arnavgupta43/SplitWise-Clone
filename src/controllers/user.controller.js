import * as Yup from "yup";
import bcrypt from "bcryptjs";
import User from "../models/user";
import { BadRequestError, NotFoundError, ValidationError } from "../utils/ApiError";



let userController = {
  register: async (req, res, next) => {
    try {
      const schema = Yup.object().shape({
        name: Yup.string().trim().required("Name is required"),
        email: Yup.string()
          .trim()
          .email("Invalid email format")
          .required("Email is required"),
        password: Yup.string()
          .min(8, "Password must be at least 8 characters")
          .required("Password is required"),
        default_currency: Yup.string().oneOf(["INR", "USD"], "Unsupported currency"),
      });

      if (!(await schema.isValid(req.body))) throw new ValidationError();

      const { name, email, password, default_currency } = req.body;

      const userExists = await User.findOne({ where: { email } });
      if (userExists) throw new BadRequestError("Email already in use");

      const password_hash = await bcrypt.hash(password, 10);

      const user = await User.create({
        name,
        email,
        password_hash,
        default_currency: default_currency || "INR",
      });

      const { password_hash: _, ...userData } = user.toJSON();
      return res.status(201).json(userData);
    } catch (error) {
      next(error);
    }
  },

  getProfile: async (req, res, next) => {
    try {
      const user = await User.findOne({
        where: { id: req.userId },
        attributes: { exclude: ["password_hash"] },
      });

      if (!user || user.deleted_at) throw new NotFoundError("User not found");

      return res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  },

  updateProfile: async (req, res, next) => {
    try {
      const schema = Yup.object().shape({
        email: Yup.string().trim().email("Invalid email format"),
        default_currency: Yup.string().oneOf(["INR", "USD"], "Unsupported currency"),
      });

      if (!(await schema.isValid(req.body))) throw new ValidationError();

      const { email, default_currency } = req.body;

      const user = await User.findOne({ where: { id: req.userId } });
      if (!user || user.deleted_at) throw new NotFoundError("User not found");

      if (email && email !== user.email) {
        const emailTaken = await User.findOne({ where: { email } });
        if (emailTaken) throw new BadRequestError("Email already in use");
      }

      const updates = {};
      if (email) updates.email = email;
      if (default_currency) updates.default_currency = default_currency;

      await user.update(updates);

      const { password_hash: _, ...userData } = user.toJSON();
      return res.status(200).json(userData);
    } catch (error) {
      next(error);
    }
  },

  deleteAccount: async (req, res, next) => {
    try {
      const user = await User.findOne({ where: { id: req.userId } });
      if (!user || user.deleted_at) throw new NotFoundError("User not found");

      await user.update({ deleted_at: new Date() });

      return res.status(200).json({ message: "Account deleted" });
    } catch (error) {
      next(error);
    }
  },
};

export default userController;
