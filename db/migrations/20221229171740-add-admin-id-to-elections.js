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

    await queryInterface.addColumn("Elections", "adminId", {
      type: Sequelize.INTEGER,
    });

    await queryInterface.addConstraint("Elections", {
      type: "foreign key",
      fields: ["adminId"],
      references: { table: "Admins", field: "id" },
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */

    await queryInterface.removeColumn("Elections", "adminId");
  },
};
