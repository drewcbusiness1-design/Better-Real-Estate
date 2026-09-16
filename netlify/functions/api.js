/* =========================================================================
   Netlify Function wrapper.

   Netlify delivers the request with the function prefix still attached —
   e.g. /.netlify/functions/api/signup — but the Express routes are
   declared as /api/signup. Without normalising the path here, every API
   call 404s. That is the single most common way this deployment breaks,
   so the rewrite below handles every shape the path can arrive in.
   ========================================================================= */
const serverless = require('serverless-http');
const app = require('../../server');

const FN_PREFIX = '/.netlify/functions/api';

function normalise(p) {
  if (!p) return '/api';
  let out = p;
  if (out.startsWith(FN_PREFIX)) out = out.slice(FN_PREFIX.length);   // strip function prefix
  if (out.startsWith('/api/api/')) out = out.slice(4);                 // collapse an accidental double
  if (!out.startsWith('/api')) out = '/api' + (out.startsWith('/') ? '' : '/') + out;
  if (out === '/api/') out = '/api';
  return out || '/api';
}

const handler = serverless(app, { binary: ['image/*', 'application/octet-stream'] });

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const path = normalise(event.path || event.rawUrl || '');
  return handler({ ...event, path, rawPath: path }, context);
};

// exported for tests
exports._normalise = normalise;
