'use client';

import { useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useComponentTree } from '@/contexts/ComponentTreeContext';

/**
 * Unified hook for page selection that handles both:
 * 1. Context state update (selectedPageId + currentPageId)
 * 2. URL update (to prevent Editor.tsx from reverting)
 *
 * Use this hook in any component that needs to select pages.
 */
export function usePageSelection() {
  const router = useRouter();
  const params = useParams();
  const binId = params.binId as string | undefined;

  const { selectPage: contextSelectPage } = useComponentTree();
  const currentUrlPageId = params.pageId as string | undefined;

  // Unified page selection - updates state AND URL
  const selectPage = useCallback(
    (pageId: string | null) => {
      // Update context state (selectedPageId + currentPageId)
      contextSelectPage(pageId);

      // Update URL only if it actually needs to change
      // This prevents unnecessary re-renders from router.replace
      if (binId && pageId && pageId !== currentUrlPageId) {
        router.replace(`/editor/${binId}/${pageId}`);
      }
    },
    [contextSelectPage, binId, router, currentUrlPageId]
  );

  return { selectPage };
}
