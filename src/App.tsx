import { ComponentTreeProvider } from './ComponentTreeContext';
import { TreePanel } from './components/TreePanel';
import { Canvas } from './components/Canvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import '@wordpress/components/build-style/style.css';

function App() {
  return (
    <ComponentTreeProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <TreePanel />
        <Canvas />
        <PropertiesPanel />
      </div>
    </ComponentTreeProvider>
  );
}

export default App;
