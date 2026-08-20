// Vercel serverless entrypoint. server/index.js exports the Express app
// (see the `require.main === module` guard there) rather than calling
// app.listen() itself -- Vercel invokes this exported handler per-request.
module.exports = require('../server/index.js');
