import * as Yup from "yup";
import User from "../models/user";
import JwtService from "../services/jwt.service";
import {
  BadRequestError,
  UnauthorizedError,
  ValidationError,
} from "../utils/ApiError";

let loginController = {
  login: async (req, res, next) => {
    try {
      const schema = Yup.object().shape({
        email: Yup.string().email().required(),
        password: Yup.string().required(),
      });

      if (!(await schema.isValid(req.body))) throw new ValidationError();

      let { email, password } = req.body;

      const user = await User.findOne({ where: { email } });

      if (!user || user.deleted_at) throw new BadRequestError("Invalid credentials");

      if (!(await user.checkPassword(password))) throw new UnauthorizedError();

      const token = JwtService.jwtSign(user.id);

      const { password_hash: _, ...userData } = user.toJSON();
      return res.status(200).json({ user: userData, token });
    } catch (error) {
      next(error);
    }
  },

  logout: async (req, res, next) => {
    try {
      JwtService.jwtBlacklistToken(JwtService.jwtGetToken(req));

      res.status(200).json({ msg: "Authorized" });
    } catch (error) {
      next(error);
    }
  },
};

export default loginController;
