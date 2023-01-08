function checkElectionOwnership(req, res, next) {
  // Get the user's id from the request
  const userId = req.user.id;

  // Find the Election record
  Election.findOne({
    where: {
      id: req.params.electionId,
      adminId: userId
    }
  }).then(election => {
    if (!election) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      });
    }

    // Allow the user to access the resource
    next();
  }).catch(error => {
    res.status(500).json({
      success: false,
      message: error.message
    });
  });
}
