const DEBUG_QUERY_KEYS = ['debug', 'yjmodDebug'];
const DEBUG_STORAGE_KEYS = ['yjmod:debug', 'yjmodDebug'];

function hasWindow() {
  return typeof window !== 'undefined';
}

function readQueryDebugFlag() {
  if (!hasWindow()) return false;
  try {
    const params = new URLSearchParams(window.location.search || '');
    return DEBUG_QUERY_KEYS.some((key) => {
      const value = params.get(key);
      return value === '1' || value === 'true' || value === 'yes';
    });
  } catch {
    return false;
  }
}

function readStorageDebugFlag() {
  if (!hasWindow()) return false;
  try {
    return DEBUG_STORAGE_KEYS.some((key) => {
      const value = window.localStorage.getItem(key);
      return value === '1' || value === 'true' || value === 'yes';
    });
  } catch {
    return false;
  }
}

function isDebugMode(explicit = false) {
  return explicit === true || readQueryDebugFlag() || readStorageDebugFlag();
}

function createFlowLogger(scope, explicit = false) {
  return (event, payload) => {
    if (!isDebugMode(explicit)) return;
    if (payload === undefined) {
      console.log(`[${scope}] ${event}`);
      return;
    }
    console.log(`[${scope}] ${event}`, payload);
  };
}

function safeStringify(value) {
  try {
    return JSON.stringify(value, (_, nested) => {
      if (nested instanceof Error) {
        return {
          name: nested.name,
          message: nested.message,
          stack: nested.stack
        };
      }
      if (typeof nested === 'function') return `[Function ${nested.name || 'anonymous'}]`;
      return nested;
    });
  } catch {
    return '"[unserializable]"';
  }
}

function debugLog(prefix, value, explicit = false) {
  if (!isDebugMode(explicit)) return;
  if (value === undefined) {
    console.log(prefix);
    return;
  }
  if (typeof value === 'string') {
    console.log(`${prefix} ${value}`);
    return;
  }
  console.log(`${prefix} ${safeStringify(value)}`);
}

function debugEvent(name, payload, explicit = false) {
  debugLog(`[EVENT FIRED] ${name}`, payload, explicit);
}

function debugStep(step, explicit = false) {
  debugLog('[STEP]', step, explicit);
}

function debugState(state, explicit = false) {
  debugLog('[STATE]', state, explicit);
}

function debugRender(label, payload, explicit = false) {
  const suffix = payload === undefined ? label : `${label} ${safeStringify(payload)}`;
  debugLog('[RENDER CALLED]', suffix, explicit);
}

function debugCatalog(status, payload, explicit = false) {
  const suffix = payload === undefined ? status : `${status} ${safeStringify(payload)}`;
  debugLog('[CATALOG READY]', suffix, explicit);
}

function debugDomUpdate(payload, explicit = false) {
  if (typeof payload === 'string') {
    debugLog('[DOM UPDATED]', payload, explicit);
    return;
  }
  debugLog('[DOM UPDATED]', payload, explicit);
}

function debugResultCount(count, payload, explicit = false) {
  const suffix = payload === undefined ? String(count) : `${count} ${safeStringify(payload)}`;
  debugLog('[RESULT COUNT]', suffix, explicit);
}

function getBuildId() {
  if (!hasWindow()) return 'server';
  return window.__YJMOD_BUILD_ID__ || document.lastModified || 'dev';
}

export {
  createFlowLogger,
  debugCatalog,
  debugDomUpdate,
  debugEvent,
  debugRender,
  debugResultCount,
  debugState,
  debugStep,
  getBuildId,
  isDebugMode,
  safeStringify
};
