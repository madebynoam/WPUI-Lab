'use client';

import React, { useEffect, useRef } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createParagraphNode, $createTextNode, EditorState } from 'lexical';

// Plugin to set initial HTML value
function InitialValuePlugin({ html }: { html: string }) {
  const [editor] = useLexicalComposerContext();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current && html && html.trim()) {
      isInitialized.current = true;
      editor.update(() => {
        try {
          const root = $getRoot();
          if (root.getChildrenSize() === 0) {
            const parser = new DOMParser();
            const dom = parser.parseFromString(html, 'text/html');
            const nodes = $generateNodesFromDOM(editor, dom);

            // Filter to only valid block nodes (paragraphs)
            const validNodes = nodes.filter((node) => {
              return node.getType() === 'paragraph' || node.getType() === 'heading' || node.getType() === 'list';
            });

            if (validNodes.length > 0) {
              root.append(...validNodes);
            } else if (html.trim()) {
              // Fallback: create a paragraph with the text content
              const paragraph = $createParagraphNode();
              paragraph.append($createTextNode(html));
              root.append(paragraph);
            }
          }
        } catch (error) {
          console.error('Error setting initial HTML:', error);
          // Fallback: just set plain text
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode(html));
          root.clear();
          root.append(paragraph);
        }
      });
    }
  }, [editor, html]);

  return null;
}

export interface RichTextControlProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  placeholder?: string;
}

export const RichTextControl: React.FC<RichTextControlProps> = ({
  label,
  value,
  onChange,
  help,
  placeholder = 'Type text...',
}) => {
  const initialConfig = {
    namespace: 'RichTextControl',
    theme: {
      text: {
        bold: 'editor-text-bold',
        italic: 'editor-text-italic',
      },
    },
    onError: (error: Error) => {
      console.error('Lexical error:', error);
    },
    editorState: value ? undefined : undefined,
  };

  const handleChange = (editorState: EditorState, editor: any) => {
    editorState.read(() => {
      const htmlString = $generateHtmlFromNodes(editor);
      // Only call onChange if value actually changed
      if (htmlString !== value) {
        onChange(htmlString);
      }
    });
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '11px',
            fontWeight: 500,
            textTransform: 'uppercase',
            color: '#1e1e1e',
          }}
        >
          {label}
        </label>
      )}

      <LexicalComposer initialConfig={initialConfig}>
        <div style={{ position: 'relative' }}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                style={{
                  minHeight: '80px',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '2px',
                  outline: 'none',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
                aria-label={label || 'Rich text editor'}
              />
            }
            placeholder={
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  color: '#999',
                  fontSize: '13px',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <OnChangePlugin onChange={handleChange} />
          <InitialValuePlugin html={value} />
        </div>
      </LexicalComposer>

      {help && (
        <p
          style={{
            margin: '4px 0 0',
            fontSize: '11px',
            color: '#757575',
            fontStyle: 'italic',
          }}
        >
          {help}
        </p>
      )}

      <style jsx global>{`
        .editor-text-bold {
          font-weight: bold;
        }
        .editor-text-italic {
          font-style: italic;
        }
      `}</style>
    </div>
  );
};
