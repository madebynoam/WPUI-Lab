'use client';

import { useState, useEffect } from 'react';
import { useComponentTree, ROOT_VSTACK_ID } from '../ComponentTreeContext';
import { PlayModeProvider } from '../PlayModeContext';
import { TopBar } from './TopBar';
import { TreePanel } from './TreePanel';
import { Canvas } from './Canvas';
import { PropertiesPanel } from './PropertiesPanel';
import { CodePanel } from './CodePanel';
import { AgentPanel } from './AgentPanel';
import { useRouter } from 'next/navigation';

interface EditorProps {
  projectId: string;
  pageId: string;
}

function EditorContent({ projectId, pageId }: EditorProps) {
  const router = useRouter();
  const {
    isPlayMode,
    setSelectedNodeIds,
    setCurrentProject,
    setCurrentPage,
  } = useComponentTree();

  // Set the current project and page when the component mounts
  useEffect(() => {
    setCurrentProject(projectId);
    setCurrentPage(pageId);
  }, [projectId, pageId, setCurrentProject, setCurrentPage]);

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
      // Cmd/Ctrl+\ to toggle header and sidebars with animation
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setShowHeader(prev => !prev);
        setShowPanels(prev => !prev);
      }

      // Escape to deselect and select page (root vstack)
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedNodeIds([ROOT_VSTACK_ID]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedNodeIds]);

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

  // Hide panels when in play mode, even if showPanels is true
  const shouldShowPanels = showPanels && !isPlayMode;

  const handleNavigateToProjects = () => {
    router.push('/');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Outer wrapper - adds padding when agent is active */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
          padding: showAgentPanel && shouldShowPanels ? '10px' : '0',
          transition: 'padding 0.3s ease-in-out',
        }}
      >
        {/* Inner editor wrapper - gets border and rounded corners when agent is active */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden',
            border: showAgentPanel && shouldShowPanels ? '1px solid #E9E9E9' : 'none',
            borderRadius: showAgentPanel && shouldShowPanels ? '8px' : '0',
            transition: 'border 0.3s ease-in-out, border-radius 0.3s ease-in-out',
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
              />
            </div>
          )}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {shouldShowPanels && (showTreePanel || showInserter) && <TreePanel showInserter={showInserter} onCloseInserter={() => setShowInserter(false)} />}
            <Canvas showBreadcrumb={showHeader && !isPlayMode} />
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
            bottom: '24px',
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

export default function Editor({ projectId, pageId }: EditorProps) {
  return (
    <PlayModeProvider>
      <EditorContent projectId={projectId} pageId={pageId} />
    </PlayModeProvider>
  );
}
