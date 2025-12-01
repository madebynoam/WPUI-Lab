'use client';

import { useState, useEffect } from 'react';
import { ComponentTreeProvider, useComponentTree, ROOT_VSTACK_ID } from './ComponentTreeContext';
import { PlayModeProvider } from './PlayModeContext';
import { TopBar } from './components/TopBar';
import { TreePanel } from './components/TreePanel';
import { Canvas } from './components/Canvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { CodePanel } from './components/CodePanel';
import { AgentPanel } from './components/AgentPanel';
import { ProjectsScreen } from './components/ProjectsScreen';
import '@wordpress/components/build-style/style.css';
import '@wordpress/block-editor/build-style/style.css';
import '@wordpress/dataviews/build-style/style.css';

type View = 'projects' | 'editor';

function AppContent() {
  const {
    isPlayMode,
    setSelectedNodeIds,
    projects,
    currentProjectId,
    createProject,
    setCurrentProject,
    deleteProject,
    renameProject,
    duplicateProject,
  } = useComponentTree();

  const [view, setView] = useState<View>('editor');
  const [showPanels, setShowPanels] = useState(true);
  const [showInserter, setShowInserter] = useState(false);
  const [showTreePanel, setShowTreePanel] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [rightPanel, setRightPanel] = useState<'props' | 'code' | 'none'>(() => {
    // Load saved panel from localStorage, default to 'props'
    const saved = localStorage.getItem('wp-designer-right-panel');
    return (saved as 'props' | 'code' | 'none') || 'props';
  });
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    // Load saved width from localStorage, default to 280
    const saved = localStorage.getItem('wp-designer-code-panel-width');
    return saved ? parseInt(saved, 10) : 280;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [showAgentPanel, setShowAgentPanel] = useState(() => {
    // Load saved state from localStorage, default to false
    const saved = localStorage.getItem('wp-designer-show-agent-panel');
    return saved === 'true';
  });

  // Save right panel selection to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('wp-designer-right-panel', rightPanel);
  }, [rightPanel]);

  // Save code panel width to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('wp-designer-code-panel-width', rightPanelWidth.toString());
  }, [rightPanelWidth]);

  // Save agent panel visibility to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('wp-designer-show-agent-panel', showAgentPanel.toString());
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
  }, [setSelectedNodeIds, ROOT_VSTACK_ID]);

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

  // Handle project actions
  const handleCreateProject = (name: string) => {
    createProject(name);
    setView('editor');
  };

  const handleOpenProject = (projectId: string) => {
    setCurrentProject(projectId);
    setView('editor');
  };

  const handleNavigateToProjects = () => {
    setView('projects');
  };

  // Render projects screen or editor
  if (view === 'projects') {
    return (
      <ProjectsScreen
        projects={projects}
        onCreateProject={handleCreateProject}
        onOpenProject={handleOpenProject}
        onDeleteProject={deleteProject}
        onRenameProject={renameProject}
        onDuplicateProject={duplicateProject}
      />
    );
  }

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
                showAgentPanel={showAgentPanel}
                onToggleAgentPanel={() => setShowAgentPanel(prev => !prev)}
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
        <AgentPanel />
      )}
    </div>
  );
}

function App() {
  return (
    <ComponentTreeProvider>
      <PlayModeProvider>
        <AppContent />
      </PlayModeProvider>
    </ComponentTreeProvider>
  );
}

export default App;
