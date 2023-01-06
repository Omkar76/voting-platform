'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Option extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Option.belongsTo(models.Question, {
        foreignKey: "questionId"
      });
    }
    
    static addOption(questionId, o) {
      return Option.create({ ...o, questionId });
    }
  }
  Option.init({
    text: DataTypes.STRING,
    voteCount : {
      type: DataTypes.INTEGER,
      defaultValue : 0
    }
  }, {
    sequelize,
    modelName: 'Option',
  });
  return Option;
};