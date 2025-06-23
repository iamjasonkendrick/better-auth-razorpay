import { APIError } from 'better-call';

const getEndpointResponse = async (ctx) => {
  const returned = ctx.context.returned;
  if (!returned) {
    return null;
  }
  if (returned instanceof Response) {
    if (returned.status !== 200) {
      return null;
    }
    return await returned.clone().json();
  }
  if (returned instanceof APIError) {
    return null;
  }
  return returned;
};

export { getEndpointResponse as g };
