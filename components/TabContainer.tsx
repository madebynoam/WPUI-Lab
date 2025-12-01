import React, { useEffect, useRef } from 'react';
import { privateApis as blockEditorPrivateApis } from '@wordpress/block-editor';
import { unlock } from '../utils/lock-unlock';

const { TabbedSidebar } = unlock(blockEditorPrivateApis);

export interface Tab {
  name: string;
  title: string;
  panel: React.ReactNode;
}

interface TabContainerProps {
  tabs: Tab[];
  selectedTab: string;
  onSelect: (tabName: string) => void;
  onClose?: () => void;
  closeButtonLabel?: string;
  defaultTabId?: string;
}

export const TabContainer: React.FC<TabContainerProps> = ({
  tabs,
  selectedTab,
  onSelect,
  onClose,
  closeButtonLabel = 'Close',
  defaultTabId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onClose && containerRef.current) {
      // Use a MutationObserver to continuously watch for and hide close buttons
      const hideCloseButtons = () => {
        const buttons = containerRef.current?.querySelectorAll('button');
        buttons?.forEach(button => {
          const ariaLabel = button.getAttribute('aria-label');
          if (ariaLabel && ariaLabel.toLowerCase().includes('close')) {
            (button as HTMLElement).style.display = 'none';
          }
        });
      };

      // Hide immediately
      hideCloseButtons();

      // Set up observer for dynamic content
      const observer = new MutationObserver(hideCloseButtons);
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-label']
      });

      return () => observer.disconnect();
    }
  }, [onClose, selectedTab]);

  // If no onClose is provided, wrap in a div and hide the close button
  if (!onClose) {
    return (
      <div ref={containerRef} id="tab-container-no-close" className="tab-container-hide-close" style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <TabbedSidebar
          tabs={tabs}
          onSelect={onSelect}
          selectedTab={selectedTab}
          defaultTabId={defaultTabId || tabs[0]?.name}
        />
      </div>
    );
  }

  return (
    <TabbedSidebar
      tabs={tabs}
      onClose={onClose}
      onSelect={onSelect}
      selectedTab={selectedTab}
      defaultTabId={defaultTabId || tabs[0]?.name}
      closeButtonLabel={closeButtonLabel}
    />
  );
};
