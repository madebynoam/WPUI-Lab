import { useState, useEffect } from 'react';
import { ComponentTreeProvider } from './ComponentTreeContext';
import { TopBar } from './components/TopBar';
import { TreePanel } from './components/TreePanel';
import { Canvas } from './components/Canvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import '@wordpress/components/build-style/style.css';

function App() {
  const [showPanels, setShowPanels] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+\ to toggle UI panels
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setShowPanels(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ComponentTreeProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <TopBar />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {showPanels && <TreePanel />}
          <Canvas />
          {showPanels && <PropertiesPanel />}
        </div>
      </div>
    </ComponentTreeProvider>
  );
}

export default App;
