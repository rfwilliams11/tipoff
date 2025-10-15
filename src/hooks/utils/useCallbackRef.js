const { useRef, useEffect } = require('react');

const useCallbackRef = (callback) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return callbackRef;
};

const useCallbackRefs = (callbacks) => {
  const refs = {};

  Object.keys(callbacks).forEach(key => {
    refs[key] = useCallbackRef(callbacks[key]);
  });

  return refs;
};

module.exports = {
  useCallbackRef,
  useCallbackRefs
};
