import React from 'react';
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
