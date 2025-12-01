'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Popover, SearchControl, Icon, Button } from '@wordpress/components';
import * as WordPressIcons from '@wordpress/icons';
import { WORDPRESS_ICON_NAMES } from '../utils/iconNames';

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  label?: string;
}

// Group icons logically
const ICON_GROUPS = {
  'Navigation': ['arrowUp', 'arrowDown', 'arrowLeft', 'arrowRight', 'chevronUp', 'chevronDown', 'chevronLeft', 'chevronRight'],
  'Content': ['paragraph', 'heading', 'quote', 'code', 'html', 'list', 'listItem', 'columns', 'table'],
  'Media': ['image', 'gallery', 'video', 'audio', 'media', 'file'],
  'UI Elements': ['button', 'box', 'tag', 'pages', 'blockDefault', 'grid', 'column', 'layout', 'group'],
  'Format': ['formatBold', 'formatItalic', 'formatUnderline', 'formatStrikethrough', 'formatListBullets', 'formatListNumbered'],
  'Communication': ['envelope', 'send', 'share', 'comment', 'mobile'],
  'Action': ['trash', 'pencil', 'create', 'copy', 'plus', 'download', 'upload', 'update', 'redo', 'undo'],
  'Status': ['check', 'close', 'error', 'caution', 'info', 'published'],
  'Tools': ['settings', 'cog', 'plugins', 'brush', 'link', 'linkOff', 'lock', 'unlock', 'search', 'filter'],
  'Other': [],
};

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Get the icon component from WordPress icons
  const getIconComponent = (iconName: string) => {
    return (WordPressIcons as any)[iconName] || null;
  };

  // Group and filter icons
  const groupedIcons = useMemo(() => {
    const groups = { ...ICON_GROUPS };
    const ungroupedIcons = new Set(WORDPRESS_ICON_NAMES);

    // Remove grouped icons from ungrouped set
    Object.values(groups).forEach(iconList => {
      iconList.forEach(icon => ungroupedIcons.delete(icon));
    });

    // Add ungrouped icons to Other
    groups['Other'] = Array.from(ungroupedIcons);

    // Filter by search term
    if (searchTerm.trim()) {
      const filtered: typeof groups = {};
      const lowerSearch = searchTerm.toLowerCase();

      Object.entries(groups).forEach(([groupName, icons]) => {
        const filteredIcons = icons.filter(icon => icon.toLowerCase().includes(lowerSearch));
        if (filteredIcons.length > 0) {
          filtered[groupName] = filteredIcons;
        }
      });

      return filtered;
    }

    return groups;
  }, [searchTerm]);

  const currentIcon = getIconComponent(value);

  return (
    <div style={{ marginBottom: '16px', position: 'relative' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
        {label || 'Icon'}
      </label>

      <div style={{ display: 'flex', gap: '4px' }}>
        <Button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          variant="secondary"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '8px',
            padding: '8px 12px',
          }}
        >
          {currentIcon && <Icon icon={currentIcon} size={20} />}
          <span style={{ flex: 1, textAlign: 'left', fontSize: '13px' }}>
            {value || 'Select an icon'}
          </span>
        </Button>

        {value && (
          <Button
            onClick={() => onChange('')}
            variant="secondary"
            icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 5L15 15M5 15L15 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>}
            title="Clear icon"
            style={{
              padding: '8px',
              minWidth: '36px',
            }}
          />
        )}
      </div>

      {isOpen && buttonRef.current ? (
        <Popover
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          anchorRect={buttonRef.current!.getBoundingClientRect()}
        >
          <div
            style={{
              width: '320px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '600px',
            }}
          >
            <div style={{ padding: '12px' }}>
              <SearchControl
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search icons..."
                __nextHasNoMarginBottom
              />
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
              {Object.entries(groupedIcons).map(([groupName, icons]) => (
                <div key={groupName} style={{ marginBottom: '20px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: '#666',
                      marginBottom: '8px',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {groupName}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '8px',
                    }}
                  >
                    {icons.map(iconName => {
                      const iconComponent = getIconComponent(iconName);
                      const isSelected = value === iconName;

                      return (
                        <button
                          key={iconName}
                          onClick={() => {
                            onChange(iconName);
                            setIsOpen(false);
                            setSearchTerm('');
                          }}
                          title={iconName}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '48px',
                            height: '48px',
                            padding: '8px',
                            border: isSelected ? '2px solid #3858e9' : '1px solid #e0e0e0',
                            borderRadius: '2px',
                            backgroundColor: isSelected ? 'rgba(56, 88, 233, 0.1)' : '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.1s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#3858e9';
                            e.currentTarget.style.backgroundColor = 'rgba(56, 88, 233, 0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = isSelected ? '#3858e9' : '#e0e0e0';
                            e.currentTarget.style.backgroundColor = isSelected ? 'rgba(56, 88, 233, 0.1)' : '#fff';
                          }}
                        >
                          {iconComponent && <Icon icon={iconComponent} size={24} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Popover>
      ) : null}
    </div>
  );
};
