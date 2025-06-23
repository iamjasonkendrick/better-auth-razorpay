import { createRandomStringGenerator } from '@better-auth/utils/random';

const generateRandomString = createRandomStringGenerator(
  "a-z",
  "0-9",
  "A-Z",
  "-_"
);

export { generateRandomString as g };
