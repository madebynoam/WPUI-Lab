import React from 'react';
import { Button } from '@wordpress/components';
import { plus as plusIcon, close as closeIcon } from '@wordpress/icons';
import { useComponentTree } from '../ComponentTreeContext';

interface TopBarProps {
  showInserter: boolean;
  onToggleInserter: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ showInserter, onToggleInserter }) => {
  const { pages, currentPageId } = useComponentTree();
  const currentPage = pages.find(p => p.id === currentPageId);

  return (
    <div className="editor-header" style={{
      height: '60px',
      backgroundColor: '#fff',
      borderBottom: '1px solid rgba(0, 0, 0, 0.133)',
      display: 'grid',
      gridTemplateColumns: '60px 200px auto 200px',
      alignItems: 'center',
      flexShrink: 0,
    }}>
      {/* Left side - Site icon hub (dark background like WordPress) */}
      <div className="editor-header__toolbar" style={{
        height: '60px',
        width: '60px',
        backgroundColor: '#1e1e1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 0,
        gap: '4px',
      }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="-2 -2 24 24"
          width="36"
          height="36"
          style={{ display: 'block' }}
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="#fff"
            d="M20 10c0-5.51-4.49-10-10-10C4.48 0 0 4.49 0 10c0 5.52 4.48 10 10 10 5.51 0 10-4.48 10-10zM7.78 15.37L4.37 6.22c.55-.02 1.17-.08 1.17-.08.5-.06.44-1.13-.06-1.11 0 0-1.45.11-2.37.11-.18 0-.37 0-.58-.01C4.12 2.69 6.87 1.11 10 1.11c2.33 0 4.45.87 6.05 2.34-.68-.11-1.65.39-1.65 1.58 0 .74.45 1.36.9 2.1.35.61.55 1.36.55 2.46 0 1.49-1.4 5-1.4 5l-3.03-8.37c.54-.02.82-.17.82-.17.5-.05.44-1.25-.06-1.22 0 0-1.44.12-2.38.12-.87 0-2.33-.12-2.33-.12-.5-.03-.56 1.2-.06 1.22l.92.08 1.26 3.41zM17.41 10c.24-.64.74-1.87.43-4.25.7 1.29 1.05 2.71 1.05 4.25 0 3.29-1.73 6.24-4.4 7.78.97-2.59 1.94-5.2 2.92-7.78zM6.1 18.09C3.12 16.65 1.11 13.53 1.11 10c0-1.3.23-2.48.72-3.59C3.25 10.3 4.67 14.2 6.1 18.09zm4.03-6.63l2.58 6.98c-.86.29-1.76.45-2.71.45-.79 0-1.57-.11-2.29-.33.81-2.38 1.62-4.74 2.42-7.10z"
          />
        </svg>
      </div>

      {/* Inserter button and undo/redo */}
      <div style={{
        gridColumn: '2 / 3',
        paddingLeft: '16px',
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
      }}>
        <Button
          onClick={onToggleInserter}
          variant="primary"
          size="compact"
          icon={showInserter ? closeIcon : plusIcon}
          label={showInserter ? 'Close inserter' : 'Open inserter'}
          style={{
            backgroundColor: '#3858e9',
            color: '#fff',
          }}
        />

      </div>

      {/* Center - Document Bar */}
      <div className="editor-header__center" style={{
        gridColumn: '3 / 4',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 0,
      }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 500,
          color: '#1e1e1e',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {currentPage?.name || 'WP Designer'}
        </div>
      </div>

      {/* Right side - Settings */}
      <div className="editor-header__settings" style={{
        gridColumn: '4 / -1',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        paddingRight: '8px',
      }}>
        <Button
          variant="primary"
          style={{
            backgroundColor: '#3858e9',
            color: '#fff',
            border: 'none',
            borderRadius: '2px',
            padding: '0 16px',
            height: '36px',
            fontSize: '13px',
            fontWeight: 400,
            cursor: 'pointer',
          }}
        >
          Play
        </Button>
      </div>
    </div>
  );
};
