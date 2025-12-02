'use client';

import { use } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the PlayModeContent with SSR disabled to avoid WordPress component SSR issues
const DynamicPlayModeContent = dynamic(() => import('./PlayModeContent'), {
  ssr: false,
  loading: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading play mode...</div>
});

export default function PlayModePage({ params }: { params: Promise<{ projectId: string; pageId: string }> }) {
  const { projectId, pageId } = use(params);
  return <DynamicPlayModeContent projectId={projectId} pageId={pageId} />;
}
