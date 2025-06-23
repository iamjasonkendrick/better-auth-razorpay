'use strict';

const random = require('@better-auth/utils/random');

const generateId = (size) => {
  return random.createRandomStringGenerator("a-z", "A-Z", "0-9")(size || 32);
};

exports.generateId = generateId;
