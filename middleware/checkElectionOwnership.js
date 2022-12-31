const { Election } = require('../db/models');

module.exports = async function (req, res, next) {
  // Get the user's id from the request
  const adminId = req.user.id;
  const electionId = parseInt(req.params.eid);

  try {
    if (isNaN(electionId)) {
      throw "Invalid election";
    }

    // Find the Election record
    const election = await Election.findOne({
      where: {
        id: electionId,
        adminId
      }
    });

    if (!election) {
      return res.status(403).json({
        success: false,
        message: "Election doesn't exist or you don't have permission"
      });
    }
    // Allow the user to access the resource
    next();
  }
  catch (error) {
    console.error(error);
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}
