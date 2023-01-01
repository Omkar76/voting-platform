'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Election extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Election.hasMany(models.Question, {
        foreignKey: "electionId",
        as: "questions"
      });

      Election.hasMany(models.Voter, {
        foreignKey : "electionId",
        as : "voters"
      });

      Election.belongsTo(models.Admin, {
        foreignKey: "adminId"
      });
    }

    static getElections(adminId) {
      const elections = Election.findAll({ where: { adminId } });
      return elections;
    }

    static addElection(adminId, e) {
      const election = Election.create({ ...e, adminId });
      return election;
    }
  }

  Election.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Non empty election name is required" }
      }
    }
  }, {
    sequelize,
    modelName: 'Election',
  });
  return Election;
};