import { useState, useEffect } from 'react';
import { ComponentTreeProvider, useComponentTree, ROOT_VSTACK_ID } from './ComponentTreeContext';
import { TopBar } from './components/TopBar';
import { TreePanel } from './components/TreePanel';
import { Canvas } from './components/Canvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { CodePanel } from './components/CodePanel';
import '@wordpress/components/build-style/style.css';
import '@wordpress/block-editor/build-style/style.css';
import '@wordpress/dataviews/build-style/style.css';

function AppContent() {
  const { isPlayMode, setSelectedNodeIds } = useComponentTree();
  const [showPanels, setShowPanels] = useState(true);
  const [showInserter, setShowInserter] = useState(false);
  const [showTreePanel, setShowTreePanel] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [rightPanel, setRightPanel] = useState<'props' | 'code' | 'none'>('props');
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    // Load saved width from localStorage, default to 280
    const saved = localStorage.getItem('wp-designer-code-panel-width');
    return saved ? parseInt(saved, 10) : 280;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Save code panel width to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('wp-designer-code-panel-width', rightPanelWidth.toString());
  }, [rightPanelWidth]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
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
          />
        </div>
      )}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {shouldShowPanels && (showTreePanel || showInserter) && <TreePanel showInserter={showInserter} onCloseInserter={() => setShowInserter(false)} />}
        <Canvas showBreadcrumb={showHeader} />
        {shouldShowPanels && rightPanel === 'props' && (
          <PropertiesPanel />
        )}
        {shouldShowPanels && rightPanel === 'code' && (
          <CodePanel width={rightPanelWidth} onResizeStart={() => setIsResizing(true)} />
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ComponentTreeProvider>
      <AppContent />
    </ComponentTreeProvider>
  );
}

export default App;
