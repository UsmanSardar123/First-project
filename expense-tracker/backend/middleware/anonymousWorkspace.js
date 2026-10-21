const mongoose = require('mongoose');

const WORKSPACE_ID = '000000000000000000000001';
const workspaceObjectId = new mongoose.Types.ObjectId(WORKSPACE_ID);

module.exports = function anonymousWorkspace(req, res, next) {
  req.user = { id: WORKSPACE_ID, _id: workspaceObjectId, name: 'Shared workspace' };
  next();
};
