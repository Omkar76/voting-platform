"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */

    await queryInterface.addColumn("Options", "questionId", {
      type: Sequelize.INTEGER,
    });

    await queryInterface.addConstraint("Options", {
      type: "foreign key",
      fields: ["questionId"],
      references: { table: "Questions", field: "id" },
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */

    await queryInterface.removeColumn("Options", "questionId");
  },
};
