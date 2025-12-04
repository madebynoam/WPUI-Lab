'use client';

import { use } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the Editor with SSR disabled to avoid WordPress component SSR issues
const DynamicEditor = dynamic(() => import('@/src/components/Editor'), {
  ssr: false,
  loading: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading editor...</div>
});

export default function EditorPage({ params }: { params: Promise<{ projectId: string; pageId: string }> }) {
  const { projectId, pageId } = use(params);
  return <DynamicEditor projectId={projectId} pageId={pageId} />;
}
