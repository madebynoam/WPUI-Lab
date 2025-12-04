'use client';

import React, { useMemo, useState } from 'react';
import { useComponentTree, ROOT_VSTACK_ID } from '@/src/contexts/ComponentTreeContext';
import { generatePageCode, generateComponentCode, generateComponentWithInteractions } from '../utils/codeGenerator';
import { highlightCode } from '../utils/syntaxHighlighter';
import { Button } from '@wordpress/components';
import { copy as copyIcon } from '@wordpress/icons';

interface CodePanelProps {
  width?: number;
  onResizeStart?: () => void;
}

export const CodePanel: React.FC<CodePanelProps> = ({ width = 280, onResizeStart }) => {
  const { selectedNodeIds, getNodeById, tree } = useComponentTree();
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    // If no selection or root page selected, show entire page code
    if (selectedNodeIds.length === 0 || selectedNodeIds[0] === ROOT_VSTACK_ID) {
      return generatePageCode(tree);
    }

    // Get the selected node
    const node = getNodeById(selectedNodeIds[0]);
    // If node doesn't exist (e.g., deleted), fall back to page code
    if (!node) {
      return generatePageCode(tree);
    }

    // Generate code with interactions if available
    if (node.interactions && node.interactions.length > 0) {
      return generateComponentWithInteractions(node);
    }

    return generateComponentCode(node, { indent: 0 });
  }, [selectedNodeIds, getNodeById, tree]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div
      style={{
        width: `${width}px`,
        borderLeft: '1px solid rgba(0, 0, 0, 0.133)',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        onMouseDown={onResizeStart}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          cursor: 'col-resize',
          backgroundColor: 'transparent',
        }}
      />
      <div style={{ padding: '12px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Code</h3>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {selectedNodeIds.length === 0 || selectedNodeIds[0] === ROOT_VSTACK_ID ? 'Page' : 'Component'} Code
          </div>
        </div>
        <Button
          icon={copyIcon}
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy code'}
          style={{
            color: copied ? '#3858e9' : '#666',
            backgroundColor: 'transparent',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
          backgroundColor: '#f5f5f5',
        }}
        onCopy={(e) => {
          // Handle copy of selected text in code panel
          e.preventDefault();
          e.stopPropagation();
          const selection = window.getSelection();
          if (selection && selection.toString().length > 0) {
            e.clipboardData.setData('text/plain', selection.toString());
          }
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
          <code>
            {useMemo(() => {
              const tokens = highlightCode(code);
              return tokens.map((token, index) => {
                const colorMap: Record<string, string> = {
                  keyword: '#3858e9',
                  string: '#a65e75',
                  tag: '#3858e9',
                  attribute: '#a65e75',
                  comment: '#858585',
                  function: '#3858e9',
                  number: '#a65e75',
                  text: '#1e1e1e',
                };
                return (
                  <span key={index} style={{ color: colorMap[token.type] || '#1e1e1e' }}>
                    {token.content}
                  </span>
                );
              });
            }, [code])}
          </code>
        </pre>
      </div>
    </div>
  );
};
