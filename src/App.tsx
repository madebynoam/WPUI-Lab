import { useState, useEffect } from 'react';
import { ComponentTreeProvider } from './ComponentTreeContext';
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
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {showPanels && <TreePanel />}
        <Canvas />
        {showPanels && <PropertiesPanel />}
      </div>
    </ComponentTreeProvider>
  );
}

export default App;
