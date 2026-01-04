'use client';

import dynamic from 'next/dynamic';

const DynamicAuthScreen = dynamic(
  () => import('../../components/AuthScreen'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        Loading...
      </div>
    ),
  }
);

export default function AuthPage() {
  return <DynamicAuthScreen />;
}
