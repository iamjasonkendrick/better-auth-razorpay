const toSvelteKitHandler = (auth) => {
  return (event) => auth.handler(event.request);
};
const svelteKitHandler = async ({
  auth,
  event,
  resolve
}) => {
  const { building } = await import('$app/environment').catch((e) => {
  }).then((m) => m || {});
  if (building) {
    return resolve(event);
  }
  const { request, url } = event;
  if (isAuthPath(url.toString(), auth.options)) {
    return auth.handler(request);
  }
  return resolve(event);
};
function isAuthPath(url, options) {
  const _url = new URL(url);
  const baseURL = new URL(
    `${options.baseURL || _url.origin}${options.basePath || "/api/auth"}`
  );
  if (_url.origin !== baseURL.origin) return false;
  if (!_url.pathname.startsWith(
    baseURL.pathname.endsWith("/") ? baseURL.pathname : `${baseURL.pathname}/`
  ))
    return false;
  return true;
}

export { isAuthPath, svelteKitHandler, toSvelteKitHandler };
