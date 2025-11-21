import { useState, useEffect } from 'react';
import { ComponentTreeProvider, useComponentTree } from './ComponentTreeContext';
import { TopBar } from './components/TopBar';
import { TreePanel } from './components/TreePanel';
import { Canvas } from './components/Canvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { CodePanel } from './components/CodePanel';
import '@wordpress/components/build-style/style.css';
import '@wordpress/block-editor/build-style/style.css';
import '@wordpress/dataviews/build-style/style.css';

function AppContent() {
  const { isPlayMode } = useComponentTree();
  const [showPanels, setShowPanels] = useState(true);
  const [showInserter, setShowInserter] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [rightPanel, setRightPanel] = useState<'props' | 'code' | 'none'>('props');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+\ to toggle header and sidebars with animation
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setShowHeader(prev => !prev);
        setShowPanels(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Hide panels when in play mode, even if showPanels is true
  const shouldShowPanels = showPanels && !isPlayMode;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {showHeader && (
        <div style={{ height: '60px' }}>
          <TopBar
            showInserter={showInserter}
            onToggleInserter={() => setShowInserter(!showInserter)}
            rightPanel={rightPanel}
            onToggleRightPanel={setRightPanel}
          />
        </div>
      )}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {shouldShowPanels && <TreePanel showInserter={showInserter} onCloseInserter={() => setShowInserter(false)} />}
        <Canvas showBreadcrumb={showHeader} />
        {shouldShowPanels && rightPanel === 'props' && <PropertiesPanel />}
        {shouldShowPanels && rightPanel === 'code' && <CodePanel />}
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
