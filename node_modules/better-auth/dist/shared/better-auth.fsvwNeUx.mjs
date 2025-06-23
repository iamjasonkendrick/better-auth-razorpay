import { z } from 'zod';

const schema = {
  jwks: {
    fields: {
      publicKey: {
        type: "string",
        required: true
      },
      privateKey: {
        type: "string",
        required: true
      },
      createdAt: {
        type: "date",
        required: true
      }
    }
  }
};
z.object({
  id: z.string(),
  publicKey: z.string(),
  privateKey: z.string(),
  createdAt: z.date()
});

export { schema as s };
