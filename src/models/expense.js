import { Model, DataTypes } from "sequelize";

class Expense extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: DataTypes.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        created_by: {
          type: DataTypes.BIGINT.UNSIGNED,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        total_amount: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
        },
        currency: {
          type: DataTypes.ENUM("INR", "USD"),
          allowNull: false,
        },
        expense_date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        split_method: {
          type: DataTypes.ENUM("EQUAL", "EXACT", "PERCENT"),
          allowNull: false,
          defaultValue: "EQUAL",
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "DELETED"),
          allowNull: false,
          defaultValue: "ACTIVE",
        },
      },
      {
        sequelize,
        tableName: "expenses",
        timestamps: true,
        underscored: true,
        paranoid: false,
      }
    );
  }

  static associate(models) {
    Expense.belongsTo(models.User, { foreignKey: "created_by", as: "creator" });
    Expense.hasMany(models.ExpenseParticipant, { foreignKey: "expense_id", as: "participants" });
  }
}

export default Expense;
