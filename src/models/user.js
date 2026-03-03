import { Model, DataTypes } from "sequelize";
import bcrypt from "bcryptjs";

class User extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: DataTypes.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        password_hash: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        default_currency: {
          type: DataTypes.ENUM("INR", "USD"),
          allowNull: false,
          defaultValue: "INR",
        },
        deleted_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "users",
        timestamps: true,
        underscored: true,
        paranoid: false,
      }
    );
  }

  static associate(models) {}

  async checkPassword(password) {
    return bcrypt.compare(password, this.password_hash);
  }
}

export default User;
