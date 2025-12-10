'use client';

import { useEffect } from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';
import { PlayModeProvider } from '@/contexts/PlayModeContext';
import { AgentDebugProvider } from '@/contexts/AgentDebugContext';
import { Canvas } from '@/components/Canvas';

export default function PlayModeContent({ projectId, pageId }: { projectId: string; pageId: string }) {
  const { currentProjectId, currentPageId, setCurrentProject, setCurrentPage, setSelectedNodeIds, setPlayMode } = useComponentTree();

  // Set the current project and page when they change
  useEffect(() => {
    // Only update if the values are different to avoid infinite loops
    if (currentProjectId !== projectId) {
      setCurrentProject(projectId);
    }
    if (currentPageId !== pageId) {
      setCurrentPage(pageId);
    }
    // Clear selection in play mode (do this once on mount)
    setSelectedNodeIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, pageId]);

  // Enable play mode on mount, disable on unmount
  useEffect(() => {
    setPlayMode(true);
    return () => {
      setPlayMode(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Full-screen Canvas in Play Mode */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <AgentDebugProvider>
          <PlayModeProvider>
            <Canvas showBreadcrumb={false} />
          </PlayModeProvider>
        </AgentDebugProvider>
      </div>
    </div>
  );
}
