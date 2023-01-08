'use strict';
const {
  Model
} = require('sequelize');

// const Option = require('./option');

module.exports = (sequelize, DataTypes) => {
  class Question extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Question.belongsTo(models.Election, {foreignKey : "electionId"});

      Question.hasMany(models.Option);
    }
  }

  Question.init({
    title: DataTypes.STRING,
    description: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Question',
  });
  return Question;
};