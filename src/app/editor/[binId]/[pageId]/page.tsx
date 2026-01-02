'use client';

import { use } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the Editor with SSR disabled to avoid WordPress component SSR issues
const DynamicEditor = dynamic(() => import('@/components/Editor'), {
  ssr: false,
  loading: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading editor...</div>
});

export default function EditorPage({ params }: { params: Promise<{ binId: string; pageId: string }> }) {
  const { binId, pageId } = use(params);
  return <DynamicEditor binId={binId} pageId={pageId} />;
}
