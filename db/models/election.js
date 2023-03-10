"use strict";
const { Model } = require("sequelize");

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
        as: "questions",
      });

      Election.hasMany(models.Voter, {
        foreignKey: "electionId",
        as: "voters",
      });

      Election.belongsTo(models.Admin, {
        foreignKey: "adminId",
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

    static async getResult(eid) {
      const electionObj = await Election.findByPk(eid, {
        attributes: ["id", "name", "launched", "ended"],
        include: [
          {
            model: sequelize.models.Question,
            attributes: ["id", "title", "description"],
            as: "questions",
            include: [
              {
                model: sequelize.models.Option,
                attributes: ["id", "text", "voteCount"],
                as: "options",
              },
            ],
          },
        ],
      });

      const election = electionObj.toJSON();
      return election;
    }
  }

  Election.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Non empty election name is required" },
        },
      },
      launched: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      ended: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "Election",
    }
  );
  return Election;
};
