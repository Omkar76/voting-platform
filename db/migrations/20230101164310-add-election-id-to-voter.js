'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */

    await queryInterface.addColumn("Voters", "electionId", {
      type: Sequelize.INTEGER,
    });

    await queryInterface.addConstraint("Voters", {
      type: "foreign key",
      fields: ["electionId"],
      references: { table: "Elections", field: "id" },
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn("Voters", "electionId");
  }
};
