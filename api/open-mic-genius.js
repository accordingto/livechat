/* Lyrics lookup has been retired. Keep the former route as a no-store tombstone
 * so older game pages cannot reactivate a provider or access a configured token.
 */
'use strict';

function createHandler() {
  return async function retiredLyrics(_request, response) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    const body = { error: 'lyrics_retired' };
    if (typeof response.status === 'function') response.status(410);
    else response.statusCode = 410;
    return typeof response.json === 'function' ? response.json(body) : response.end(JSON.stringify(body));
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
