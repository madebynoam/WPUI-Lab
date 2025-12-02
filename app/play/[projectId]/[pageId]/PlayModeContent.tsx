'use client';

import { useEffect } from 'react';
import { useComponentTree } from '../../../../src/ComponentTreeContext';
import { PlayModeProvider } from '../../../../src/PlayModeContext';
import { Canvas } from '../../../../src/components/Canvas';
import { Button } from '@wordpress/components';
import { close } from '@wordpress/icons';
import { useRouter } from 'next/navigation';

export default function PlayModeContent({ projectId, pageId }: { projectId: string; pageId: string }) {
  const router = useRouter();
  const { setCurrentProject, setCurrentPage, setSelectedNodeIds } = useComponentTree();

  // Set the current project and page when the component mounts
  useEffect(() => {
    setCurrentProject(projectId);
    setCurrentPage(pageId);
    // Clear selection in play mode
    setSelectedNodeIds([]);
  }, [projectId, pageId, setCurrentProject, setCurrentPage, setSelectedNodeIds]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Exit Play Mode Button */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 1000,
      }}>
        <Button
          icon={close}
          label="Exit Play Mode"
          onClick={() => router.push(`/editor/${projectId}/${pageId}`)}
          variant="primary"
          style={{
            backgroundColor: '#fff',
            color: '#1e1e1e',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        />
      </div>

      {/* Full-screen Canvas in Play Mode */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <PlayModeProvider>
          <Canvas showBreadcrumb={false} />
        </PlayModeProvider>
      </div>
    </div>
  );
}
