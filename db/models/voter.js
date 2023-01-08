"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Voter extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Voter.belongsTo(models.Election, { foreignKey: "electionId" });
    }

    static addVoter(electionId, voter) {
      Voter.create({ ...voter, electionId });
    }
  }
  Voter.init(
    {
      username: DataTypes.STRING,
      password: DataTypes.STRING,
      voted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "Voter",
    }
  );
  return Voter;
};
