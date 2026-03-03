"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("expenses", {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      created_by: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      total_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.CHAR(3),
        allowNull: false,
      },
      expense_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      split_method: {
        type: Sequelize.ENUM("EQUAL", "EXACT", "PERCENT"),
        allowNull: false,
        defaultValue: "EQUAL",
      },
      status: {
        type: Sequelize.ENUM("ACTIVE", "DELETED"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addConstraint("expenses", {
      fields: ["created_by"],
      type: "foreign key",
      name: "fk_expenses_created_by",
      references: { table: "users", field: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    await queryInterface.addIndex("expenses", ["created_by"], {
      name: "idx_expenses_created_by",
    });

    await queryInterface.addIndex("expenses", ["expense_date"], {
      name: "idx_expenses_expense_date",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("expenses");
  },
};
