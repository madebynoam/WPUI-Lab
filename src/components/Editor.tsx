'use client';

import { useState, useEffect, useCallback } from 'react';
import { useComponentTree, ROOT_GRID_ID } from '@/contexts/ComponentTreeContext';
import { PlayModeProvider } from '@/contexts/PlayModeContext';
import { AgentDebugProvider } from '@/contexts/AgentDebugContext';
import { TopBar } from './TopBar';
import { TreePanel } from './TreePanel';
import { Canvas } from './Canvas';
import { PropertiesPanel } from './PropertiesPanel';
import { CodePanel } from './CodePanel';
import { AgentPanel } from './AgentPanel';
import { Breadcrumb } from './Breadcrumb';
import { ViewportPresetButtons } from './ViewportPresetButtons';
import { ZoomSlider } from './ZoomSlider';
import { WiresToggleButton } from './WiresToggleButton';
import { useRouter } from 'next/navigation';
import { useCloudProject } from '@/hooks/useCloudProject';

interface EditorProps {
  binId: string;  // JSONBin ID - this IS the project identifier
  pageId: string;
}

function EditorContent({ binId, pageId }: EditorProps) {
  const router = useRouter();
  const {
    isPlayMode,
    setSelectedNodeIds,
    setCurrentPage,
    isAgentExecuting,
    projects,
    currentProjectId,
    currentPageId,
    importProject,
    isDirty,
    markSaved,
  } = useComponentTree();

  // Get current project from projects array
  const currentProject = projects.find(p => p.id === currentProjectId);

  // Cloud save state - binId from route IS the cloud identifier
  const { loadProject, saveProject, isSaving } = useCloudProject();
  const [cloudMeta, setCloudMeta] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if the CORRECT project is already loaded (binId stored in project matches URL)
  const isCorrectProjectLoaded = currentProject?.binId === binId;

  // Load from cloud on mount (only if correct project not already in context)
  useEffect(() => {
    if (binId && !isCorrectProjectLoaded && !isLoading) {
      setIsLoading(true);
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
            binId, // Store the cloud binId in the project
            pages: data.project.pages.map((page: any) => ({
              ...page,
              tree: page.tree?.length > 0 ? page.tree : [rootGrid],
            })),
          };

          // Import the project into context and set as current
          importProject(fixedProject);
          // Set the current page (use first page if pageId doesn't match)
          const validPageId = fixedProject.pages.some((p: any) => p.id === pageId)
            ? pageId
            : fixedProject.pages[0]?.id;
          if (validPageId) {
            setCurrentPage(validPageId);
          }
          setCloudMeta(data.meta);
          // Mark as saved since we just loaded from cloud
          markSaved();
        }
      }).finally(() => {
        setIsLoading(false);
      });
    } else if (isCorrectProjectLoaded && currentPageId !== pageId) {
      // Correct project already loaded, just switch page
      // This handles browser back/forward navigation and direct URL access
      // Note: When user clicks a page, usePageSelection already sets currentPageId,
      // so this will be a no-op in that case (currentPageId === pageId)
      setCurrentPage(pageId);
    }
  }, [binId, loadProject, importProject, pageId, setCurrentPage, isCorrectProjectLoaded, currentPageId, markSaved]);

  // Warn before close if unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty && binId) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, binId]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!binId || !currentProject) return;
    const result = await saveProject(binId, currentProject, cloudMeta);
    if (result) {
      setCloudMeta({ ...cloudMeta, ...result });
      markSaved();
    }
  }, [binId, currentProject, cloudMeta, saveProject, markSaved]);

  const [showPanels, setShowPanels] = useState(true);
  const [showInserter, setShowInserter] = useState(false);
  const [showTreePanel, setShowTreePanel] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [rightPanel, setRightPanel] = useState<'props' | 'code' | 'none'>(() => {
    if (typeof window === 'undefined') return 'props';
    const saved = localStorage.getItem('wp-designer-right-panel');
    return (saved as 'props' | 'code' | 'none') || 'props';
  });
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return 280;
    const saved = localStorage.getItem('wp-designer-code-panel-width');
    return saved ? parseInt(saved, 10) : 280;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [showAgentPanel, setShowAgentPanel] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('wp-designer-show-agent-panel');
    return saved === 'true';
  });

  // Save right panel selection to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wp-designer-right-panel', rightPanel);
    }
  }, [rightPanel]);

  // Prevent browser back/forward swipe gestures in the editor
  // Combining overscroll-behavior with overflow-x: hidden (recommended approach)
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'prevent-swipe-navigation';
    style.textContent = `
      html, body {
        overscroll-behavior: none !important;
        overscroll-behavior-x: none !important;
        overflow-x: hidden !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById('prevent-swipe-navigation');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Save code panel width to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wp-designer-code-panel-width', rightPanelWidth.toString());
    }
  }, [rightPanelWidth]);

  // Save agent panel visibility to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wp-designer-show-agent-panel', showAgentPanel.toString());
    }
  }, [showAgentPanel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (binId && isDirty && !isSaving) {
          handleSave();
        }
      }

      // Cmd/Ctrl+\ to toggle header and sidebars with animation
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setShowHeader(prev => !prev);
        setShowPanels(prev => !prev);
      }

      // Escape to deselect and select page (root vstack)
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedNodeIds([ROOT_GRID_ID]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedNodeIds, binId, isDirty, isSaving, handleSave]);

  // Handle panel resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const viewport = window.innerWidth;
      const newWidth = viewport - e.clientX;

      // Constrain between 200px and 600px
      if (newWidth >= 200 && newWidth <= 600) {
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'auto';
      document.body.style.cursor = 'auto';
    };
  }, [isResizing]);

  // Hide panels when in play mode
  const shouldShowPanels = showPanels && !isPlayMode;

  const handleNavigateToProjects = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    router.push('/');
  }, [isDirty, router]);

  // Show loading state only while actively loading from cloud
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1F1F1F',
        color: '#fff'
      }}>
        Loading project...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', cursor: isAgentExecuting ? 'progress' : 'default' }}>
      {/* Outer wrapper - adds padding when agent is active */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
          padding: showAgentPanel && shouldShowPanels ? '10px' : '0',
          transition: 'padding 0.3s ease-in-out',
          backgroundColor: '#1F1F1F',
        }}
      >
        {/* Inner editor wrapper - gets border and rounded corners when agent is active */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden',
            border: 'none',
            borderRadius: showAgentPanel && shouldShowPanels ? '8px' : '0',
            transition: 'border-radius 0.3s ease-in-out',
          }}
        >
          {showHeader && (
            <div style={{ height: '60px' }}>
              <TopBar
                showInserter={showInserter}
                onToggleInserter={() => {
                  if (showInserter) {
                    setShowInserter(false);
                  } else {
                    setShowInserter(true);
                    setShowTreePanel(false);
                  }
                }}
                showTreePanel={showTreePanel}
                onToggleTreePanel={() => {
                  if (showTreePanel) {
                    setShowTreePanel(false);
                  } else {
                    setShowTreePanel(true);
                    setShowInserter(false);
                  }
                }}
                rightPanel={rightPanel}
                onToggleRightPanel={setRightPanel}
                onNavigateToProjects={handleNavigateToProjects}
                binId={binId}
                pageId={pageId}
                projectName={currentProject?.name}
                // Cloud save props
                isDirty={isDirty}
                isSaving={isSaving}
                onSave={handleSave}
              />
            </div>
          )}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {shouldShowPanels && (showTreePanel || showInserter) && <TreePanel showInserter={showInserter} onCloseInserter={() => setShowInserter(false)} />}

            {/* Middle section: Canvas + Bottom Bar wrapper */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Canvas />

              {/* Bottom bar - breadcrumb and viewport controls */}
              {showHeader && !isPlayMode && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 16px',
                  borderTop: '1px solid rgba(0,0,0,0.1)',
                  backgroundColor: '#fff',
                }}>
                  <Breadcrumb />
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <ViewportPresetButtons />
                    <ZoomSlider />
                    <WiresToggleButton />
                  </div>
                </div>
              )}
            </div>

            {shouldShowPanels && rightPanel === 'props' && (
              <PropertiesPanel />
            )}
            {shouldShowPanels && rightPanel === 'code' && (
              <CodePanel width={rightPanelWidth} onResizeStart={() => setIsResizing(true)} />
            )}
          </div>
        </div>
      </div>
      {/* Agent panel - completely outside editor wrapper */}
      {shouldShowPanels && showAgentPanel && (
        <AgentPanel onClose={() => setShowAgentPanel(false)} />
      )}

      {/* Floating AI button - bottom right */}
      {shouldShowPanels && !showAgentPanel && (
        <button
          onClick={() => setShowAgentPanel(true)}
          style={{
            position: 'fixed',
            bottom: '72px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            transition: 'opacity 0.3s ease-in-out, transform 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Open AI assistant"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19.6611 11.5224L16.3782 10.39C15.0799 9.94388 14.0561 8.92011 13.61 7.62181L12.4776 4.33887C12.3231 3.88704 11.6769 3.88704 11.5224 4.33887L10.39 7.62181C9.94388 8.92011 8.92011 9.94388 7.62181 10.39L4.33887 11.5224C3.88704 11.6769 3.88704 12.3231 4.33887 12.4776L7.62181 13.61C8.92011 14.0561 9.94388 15.0799 10.39 16.3782L11.5224 19.6611C11.6769 20.113 12.3231 20.113 12.4776 19.6611L13.61 16.3782C14.0561 15.0799 15.0799 14.0561 16.3782 13.61L19.6611 12.4776C20.113 12.3231 20.113 11.6769 19.6611 11.5224ZM15.8291 12.2431L14.1877 12.8093C13.5357 13.0324 13.0266 13.5471 12.8036 14.1934L12.2374 15.8349C12.1573 16.0636 11.837 16.0636 11.7569 15.8349L11.1907 14.1934C10.9677 13.5414 10.4529 13.0324 9.80661 12.8093L8.16515 12.2431C7.93637 12.163 7.93637 11.8427 8.16515 11.7626L9.80661 11.1964C10.4586 10.9734 10.9677 10.4586 11.1907 9.81233L11.7569 8.17087C11.837 7.94209 12.1573 7.94209 12.2374 8.17087L12.8036 9.81233C13.0266 10.4643 13.5414 10.9734 14.1877 11.1964L15.8291 11.7626C16.0579 11.8427 16.0579 12.163 15.8291 12.2431Z"
              fill="#3858E9"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function Editor({ binId, pageId }: EditorProps) {
  return (
    <PlayModeProvider>
      <AgentDebugProvider>
        <EditorContent binId={binId} pageId={pageId} />
      </AgentDebugProvider>
    </PlayModeProvider>
  );
}
