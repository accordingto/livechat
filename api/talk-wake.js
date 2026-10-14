'use strict';

// Invoked by the private queue/v2beta trigger. The SDK verifies/receives the
// native message; the encrypted ticket is authenticated again by the executor.
module.exports = require('../runtime/talk-wake-queue.cjs').createWakeHandler();
