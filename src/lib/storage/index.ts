import type { StorageProvider } from './types';
import { JSONBinProvider } from './jsonbin';

export type { StorageProvider, ProjectSummary, ProjectData, CreateProjectResult, ProjectMeta } from './types';

let cachedProvider: StorageProvider | null = null;

/**
 * Get the configured storage provider.
 *
 * Uses STORAGE_PROVIDER env var to determine which provider to use.
 * Defaults to 'jsonbin' if not specified.
 *
 * Provider instances are cached for the lifetime of the process.
 */
export function getStorageProvider(): StorageProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerType = process.env.STORAGE_PROVIDER || 'jsonbin';

  switch (providerType) {
    case 'jsonbin':
      cachedProvider = new JSONBinProvider();
      break;
    // Future providers:
    // case 'supabase':
    //   cachedProvider = new SupabaseProvider();
    //   break;
    // case 'firebase':
    //   cachedProvider = new FirebaseProvider();
    //   break;
    default:
      throw new Error(`Unknown storage provider: ${providerType}`);
  }

  return cachedProvider;
}

/**
 * Clear the cached provider instance.
 * Useful for testing or hot-reloading configuration.
 */
export function clearStorageProviderCache(): void {
  cachedProvider = null;
}
