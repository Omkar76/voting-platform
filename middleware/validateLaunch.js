const { Election } = require("../db/models");

module.exports = async function validateLaunch(req, res, next) {
  const election = await Election.getResult(req.params.eid);

  const errors = validateElection(election);

  errors.length && req.flash("error", errors);

  if (errors?.length) {
    res.redirect("/elections/" + req.params.eid);
    return console.info(errors);
  }
  req.election = election;
  next();
};

function validateElection(election) {
  const errors = [];

  if (!election) {
    errors.push("Invalid election"); // this is unlikely to happen but idk i'll just keep this here.
    return errors;
  }

  if (election?.questions?.length < 1) {
    errors.push("Election must have atleast on question!");
    return errors;
  }

  for (let question of election.questions) {
    if (question?.options?.length < 2) {
      errors.push(`Question "${question.title}" has less than 2 options`);
    }
  }

  return errors;
}
