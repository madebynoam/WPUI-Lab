import React, { useMemo } from 'react';
import { useComponentTree, ROOT_VSTACK_ID } from '../ComponentTreeContext';
import { generatePageCode, generateComponentCode, generateComponentWithInteractions } from '../utils/codeGenerator';

export const CodePanel: React.FC = () => {
  const { selectedNodeIds, getNodeById, tree } = useComponentTree();

  const code = useMemo(() => {
    // If no selection or root page selected, show entire page code
    if (selectedNodeIds.length === 0 || selectedNodeIds[0] === ROOT_VSTACK_ID) {
      return generatePageCode(tree);
    }

    // Get the selected node
    const node = getNodeById(selectedNodeIds[0]);
    if (!node) {
      return '// No component selected';
    }

    // Generate code with interactions if available
    if (node.interactions && node.interactions.length > 0) {
      return generateComponentWithInteractions(node);
    }

    return generateComponentCode(node, { indent: 0 });
  }, [selectedNodeIds, getNodeById, tree]);

  return (
    <div
      style={{
        width: '280px',
        borderLeft: '1px solid rgba(0, 0, 0, 0.133)',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Code</h3>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
          {selectedNodeIds.length === 0 || selectedNodeIds[0] === ROOT_VSTACK_ID ? 'Page' : 'Component'} Code
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
          backgroundColor: '#f5f5f5',
        }}
      >
        <pre
          style={{
            margin: 0,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: '12px',
            lineHeight: '1.5',
            color: '#1e1e1e',
            backgroundColor: '#fff',
            padding: '12px',
            borderRadius: '2px',
            overflow: 'auto',
            maxHeight: '100%',
          }}
        >
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
