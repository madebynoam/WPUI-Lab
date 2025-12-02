'use client';

import React, { useEffect, useRef, useState } from 'react';

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

  // Lazy load TabbedSidebar only on client
  const [TabbedSidebar, setTabbedSidebar] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !TabbedSidebar) {
      (async () => {
        // @ts-ignore - No types available for @wordpress/block-editor
        const blockEditor = await import('@wordpress/block-editor');
        const lockUnlock = await import('../utils/lock-unlock');
        const component = lockUnlock.unlock(blockEditor.privateApis).TabbedSidebar;
        setTabbedSidebar(() => component);
      })();
    }
  }, [TabbedSidebar]);

  useEffect(() => {
    if (!onClose && containerRef.current && TabbedSidebar) {
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
  }, [onClose, selectedTab, TabbedSidebar]);

  // Return null during SSR or while loading
  if (!TabbedSidebar) {
    return null;
  }

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
