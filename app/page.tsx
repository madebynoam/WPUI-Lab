'use client';

import dynamic from 'next/dynamic';

// Dynamically import the App with SSR disabled to avoid WordPress component SSR issues
const DynamicApp = dynamic(() => import('../src/ClientApp'), {
  ssr: false,
  loading: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>
});

export default function EditorPage() {
  return <DynamicApp />;
}
