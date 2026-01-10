'use client';

import { useEffect, useState } from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';
import { PlayModeProvider } from '@/contexts/PlayModeContext';
import { AgentDebugProvider } from '@/contexts/AgentDebugContext';
import { Canvas } from '@/components/Canvas';
import { useCloudProject } from '@/hooks/useCloudProject';

export default function PlayModeContent({ binId, pageId }: { binId: string; pageId: string }) {
  const { setCurrentPage, setSelectedNodeIds, setPlayMode, importProject } = useComponentTree();
  const { loadProject } = useCloudProject();
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Load project from cloud on mount
  useEffect(() => {
    if (binId && !initialLoadDone) {
      loadProject(binId).then(data => {
        if (data?.project) {
          // Ensure each page has a root grid (fix for old projects)
          const rootGrid = {
            id: 'root-grid',
            type: 'Grid',
            props: { columns: 12, gap: 24, gridGuideColor: '#3858e9' },
            children: [],
            interactions: [],
          };
          const fixedProject = {
            ...data.project,
            pages: data.project.pages.map((page: any) => ({
              ...page,
              tree: page.tree?.length > 0 ? page.tree : [rootGrid],
            })),
          };

          importProject(fixedProject);
          const validPageId = fixedProject.pages.some((p: any) => p.id === pageId)
            ? pageId
            : fixedProject.pages[0]?.id;
          if (validPageId) {
            setCurrentPage(validPageId);
          }
          setInitialLoadDone(true);
        }
      });
    }
  }, [binId, loadProject, initialLoadDone, importProject, pageId, setCurrentPage]);

  // Enable play mode on mount, disable on unmount
  useEffect(() => {
    setPlayMode(true);
    setSelectedNodeIds([]);
    return () => {
      setPlayMode(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show loading state while loading from cloud
  if (!initialLoadDone) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        color: '#333'
      }}>
        Loading...
      </div>
    );
  }

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
