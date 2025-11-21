import React, { useMemo } from 'react';

export interface Tab {
  name: string;
  title?: string;
  icon?: React.ReactNode;
  panel: React.ReactNode;
}

interface TabContainerProps {
  tabs: Tab[];
  selectedTab: string;
  onSelect: (tabName: string) => void;
  iconOnly?: boolean;
  iconSize?: number;
}

export const TabContainer: React.FC<TabContainerProps> = ({
  tabs,
  selectedTab,
  onSelect,
  iconOnly = false,
  iconSize = 24,
}) => {
  const selectedTabData = useMemo(
    () => tabs.find((tab) => tab.name === selectedTab),
    [tabs, selectedTab]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab buttons */}
      <div style={{ display: 'flex', borderBottom: '3px solid #3858e9' }}>
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => onSelect(tab.name)}
            style={{
              flex: 1,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: selectedTab === tab.name ? '#fff' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: selectedTab === tab.name ? '#000' : '#999',
              fontSize: iconOnly ? `${iconSize}px` : '13px',
              fontWeight: selectedTab === tab.name ? 500 : 400,
            }}
            title={tab.title || tab.name}
          >
            {tab.icon && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: `${iconSize}px`,
                }}
              >
                {tab.icon}
              </span>
            )}
            {!iconOnly && tab.title && tab.title}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {selectedTabData && selectedTabData.panel}
      </div>
    </div>
  );
};
