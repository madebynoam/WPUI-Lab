'use client';

import { useEffect } from 'react';
import { useComponentTree } from '../../../../src/ComponentTreeContext';
import { PlayModeProvider } from '../../../../src/PlayModeContext';
import { Canvas } from '../../../../src/components/Canvas';

export default function PlayModeContent({ projectId, pageId }: { projectId: string; pageId: string }) {
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
      {/* Full-screen Canvas in Play Mode */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <PlayModeProvider>
          <Canvas showBreadcrumb={false} />
        </PlayModeProvider>
      </div>
    </div>
  );
}
