'use strict';

const nanostores = require('nanostores');

const isServer = typeof window === "undefined";
const useAuthQuery = (initializedAtom, path, $fetch, options) => {
  const value = nanostores.atom({
    data: null,
    error: null,
    isPending: true,
    isRefetching: false,
    refetch: () => {
      return fn();
    }
  });
  const fn = () => {
    const opts = typeof options === "function" ? options({
      data: value.get().data,
      error: value.get().error,
      isPending: value.get().isPending
    }) : options;
    return $fetch(path, {
      ...opts,
      async onSuccess(context) {
        value.set({
          data: context.data,
          error: null,
          isPending: false,
          isRefetching: false,
          refetch: value.value.refetch
        });
        await opts?.onSuccess?.(context);
      },
      async onError(context) {
        const { request } = context;
        const retryAttempts = typeof request.retry === "number" ? request.retry : request.retry?.attempts;
        const retryAttempt = request.retryAttempt || 0;
        if (retryAttempts && retryAttempt < retryAttempts) return;
        value.set({
          error: context.error,
          data: null,
          isPending: false,
          isRefetching: false,
          refetch: value.value.refetch
        });
        await opts?.onError?.(context);
      },
      async onRequest(context) {
        const currentValue = value.get();
        value.set({
          isPending: currentValue.data === null,
          data: currentValue.data,
          error: null,
          isRefetching: true,
          refetch: value.value.refetch
        });
        await opts?.onRequest?.(context);
      }
    });
  };
  initializedAtom = Array.isArray(initializedAtom) ? initializedAtom : [initializedAtom];
  let isMounted = false;
  for (const initAtom of initializedAtom) {
    initAtom.subscribe(() => {
      if (isServer) {
        return;
      }
      if (isMounted) {
        fn();
      } else {
        nanostores.onMount(value, () => {
          setTimeout(() => {
            fn();
          }, 0);
          isMounted = true;
          return () => {
            value.off();
            initAtom.off();
          };
        });
      }
    });
  }
  return value;
};

exports.useAuthQuery = useAuthQuery;
