'use strict';

const random = require('@better-auth/utils/random');

const generateRandomString = random.createRandomStringGenerator(
  "a-z",
  "0-9",
  "A-Z",
  "-_"
);

exports.generateRandomString = generateRandomString;
