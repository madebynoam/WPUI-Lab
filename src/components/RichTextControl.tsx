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

// Plugin to sync external HTML changes to editor
function SyncValuePlugin({ html }: { html: string }) {
  const [editor] = useLexicalComposerContext();
  const previousHtml = useRef<string>('');
  const isInternalChange = useRef(false);

  useEffect(() => {
    // Skip if this is an internal change (from typing)
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    // Skip if html hasn't actually changed
    if (html === previousHtml.current) {
      return;
    }

    previousHtml.current = html;

    editor.update(() => {
      const root = $getRoot();

      try {
        // Clear existing content
        root.clear();

        if (html && html.trim()) {
          // Clean up HTML before parsing - remove wrapper spans and normalize
          let cleanHtml = html
            .replace(/<span[^>]*style="white-space:\s*pre-wrap;"[^>]*>(.*?)<\/span>/g, '$1') // Remove white-space wrapper
            .replace(/<b>/g, '<strong>').replace(/<\/b>/g, '</strong>') // Normalize bold tags
            .replace(/<i>/g, '<em>').replace(/<\/i>/g, '</em>') // Normalize italic tags
            .replace(/\sclass="editor-text-[^"]*"/g, '') // Remove only editor-specific classes
            .replace(/\sstyle="white-space:\s*pre-wrap;?"/g, ''); // Remove only white-space styles

          // If HTML doesn't start with a block element, wrap it in <p> tags
          // This ensures formatting is preserved when parsing
          if (!cleanHtml.match(/^<(p|h[1-6]|div|ul|ol|li|blockquote)/i)) {
            // Replace <br> tags with paragraph breaks for proper structure
            const parts = cleanHtml.split(/<br\s*\/?>/i);
            cleanHtml = parts.map(part => part.trim() ? `<p>${part}</p>` : '').filter(Boolean).join('');
            if (!cleanHtml) cleanHtml = `<p>${html}</p>`; // Fallback if all parts were empty
          }

          console.log('[RichTextControl] Parsing HTML:', cleanHtml);

          const parser = new DOMParser();
          const dom = parser.parseFromString(cleanHtml, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);

          console.log('[RichTextControl] Generated nodes:', nodes.length);

          // Filter to only valid block nodes (paragraphs)
          const validNodes = nodes.filter((node) => {
            return node.getType() === 'paragraph' || node.getType() === 'heading' || node.getType() === 'list';
          });

          if (validNodes.length > 0) {
            root.append(...validNodes);
          } else {
            // This should rarely happen now that we wrap in <p> tags
            console.warn('[RichTextControl] No valid nodes found, falling back to plain text');
            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode(html));
            root.append(paragraph);
          }
        } else {
          // Empty content - add empty paragraph
          const paragraph = $createParagraphNode();
          root.append(paragraph);
        }
      } catch (error) {
        console.error('Error setting HTML:', error);
        // Fallback: just set plain text
        root.clear();
        const paragraph = $createParagraphNode();
        if (html) {
          // Extract text content only
          const textContent = html.replace(/<[^>]*>/g, '');
          paragraph.append($createTextNode(textContent));
        }
        root.append(paragraph);
      }
    });
  }, [editor, html]);

  // Expose method to mark internal changes
  useEffect(() => {
    (editor as any).markInternalChange = () => {
      isInternalChange.current = true;
    };
  }, [editor]);

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
      // Generate HTML and strip paragraph tags to avoid spacing issues
      let htmlString = $generateHtmlFromNodes(editor);

      // Remove wrapping <p> tags and replace closing </p> with <br>
      // This gives us simple HTML with just <strong>, <em>, and <br> for line breaks
      htmlString = htmlString
        .replace(/<p[^>]*>/g, '') // Remove opening <p> tags
        .replace(/<\/p>/g, '<br>') // Replace closing </p> with <br>
        .replace(/(<br\s*\/?>){2,}/g, '<br>') // Collapse multiple <br> tags to single
        .replace(/<br>$/, ''); // Remove trailing <br>

      // Only call onChange if value actually changed
      if (htmlString !== value) {
        // Mark this as an internal change so SyncValuePlugin doesn't override it
        if ((editor as any).markInternalChange) {
          (editor as any).markInternalChange();
        }
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
        <div
          style={{ position: 'relative' }}
          onKeyDown={(e) => {
            // Prevent ALL keyboard events from bubbling to canvas
            e.stopPropagation();
            // Don't prevent default for text editing keys
          }}
        >
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="rich-text-editor"
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
          <SyncValuePlugin html={value} />
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

      <style>{`
        .rich-text-editor .editor-text-bold {
          font-weight: bold !important;
        }
        .rich-text-editor .editor-text-italic {
          font-style: italic !important;
        }
        .rich-text-editor strong {
          font-weight: bold !important;
        }
        .rich-text-editor em {
          font-style: italic !important;
        }
        .rich-text-editor [data-lexical-text="true"] {
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  );
};
