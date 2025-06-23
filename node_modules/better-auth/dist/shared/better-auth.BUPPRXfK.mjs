import { createRandomStringGenerator } from '@better-auth/utils/random';

const generateId = (size) => {
  return createRandomStringGenerator("a-z", "A-Z", "0-9")(size || 32);
};

export { generateId as g };
