'use client';

import dynamic from 'next/dynamic';

// Dynamically import the ProjectsPage with SSR disabled to avoid WordPress component SSR issues
const DynamicProjectsPage = dynamic(() => import('@/src/components/ProjectsPage'), {
  ssr: false,
  loading: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>
});

export default function ProjectsPage() {
  return <DynamicProjectsPage />;
}
