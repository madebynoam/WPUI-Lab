'use client';

import { use } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the PlayModeContent with SSR disabled to avoid WordPress component SSR issues
const DynamicPlayModeContent = dynamic(() => import('@/components/PlayModeContent'), {
  ssr: false,
  loading: () => null
});

export default function PlayModePage({ params }: { params: Promise<{ binId: string; pageId: string }> }) {
  const { binId, pageId } = use(params);
  return <DynamicPlayModeContent binId={binId} pageId={pageId} />;
}
