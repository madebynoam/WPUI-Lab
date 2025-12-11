/**
 * Component Registry Loader
 *
 * Provides a way to load componentRegistry that works in both browser and Node.js
 */

let _componentRegistry: Record<string, any> | null = null;
let _loadPromise: Promise<void> | null = null;

/**
 * Load componentRegistry - works in both browser and Node.js
 * Returns empty registry in Node.js since WordPress components don't work there
 */
export async function loadComponentRegistry(): Promise<Record<string, any>> {
  // Already loaded
  if (_componentRegistry !== null) {
    return _componentRegistry;
  }

  // Currently loading
  if (_loadPromise !== null) {
    await _loadPromise;
    return _componentRegistry!;
  }

  // Start loading
  _loadPromise = (async () => {
    try {
      if (typeof window !== 'undefined') {
        // Browser - load real componentRegistry
        const module = await import('@/componentRegistry');
        _componentRegistry = module.componentRegistry;
      } else {
        // Node.js - load mock
        const module = await import('@/componentRegistry/index.node');
        _componentRegistry = module.componentRegistry;
      }
    } catch (e) {
      console.error('[componentRegistryLoader] Failed to load:', e);
      _componentRegistry = {};
    }
  })();

  await _loadPromise;
  return _componentRegistry!;
}

/**
 * Get componentRegistry synchronously
 * Returns empty object if not yet loaded
 */
export function getComponentRegistrySync(): Record<string, any> {
  return _componentRegistry || {};
}
