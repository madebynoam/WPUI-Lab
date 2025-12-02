'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Popover, Button, SearchControl } from '@wordpress/components';
import { Icon } from '@wordpress/components';
import { check } from '@wordpress/icons';

interface ColorVariantPickerProps {
  value: string;
  onChange: (colorVariant: string) => void;
  label?: string;
}

// Color variant definitions organized by category
interface ColorVariant {
  value: string;
  label: string;
  description: string;
  cssVar: string;
  color: string; // Actual color value for display
  group: string;
}

const COLOR_VARIANTS: ColorVariant[] = [
  {
    value: 'default',
    label: 'Default',
    description: 'Inherits current text color',
    cssVar: 'currentColor',
    color: '#1e1e1e',
    group: 'Default',
  },
  // Content - Brand
  {
    value: 'content-brand',
    label: 'Brand',
    description: 'Brand content color',
    cssVar: 'var(--wpds-color-fg-content-brand)',
    color: '#3858e9',
    group: 'Content',
  },
  // Content - Neutral
  {
    value: 'content-neutral',
    label: 'Neutral',
    description: 'Standard content color',
    cssVar: 'var(--wpds-color-fg-content-neutral)',
    color: '#1e1e1e',
    group: 'Content',
  },
  {
    value: 'content-neutral-weak',
    label: 'Neutral Weak',
    description: 'Subtle content color',
    cssVar: 'var(--wpds-color-fg-content-neutral-weak)',
    color: '#757575',
    group: 'Content',
  },
  // Content - Status Colors
  {
    value: 'content-error',
    label: 'Error',
    description: 'Error state color',
    cssVar: 'var(--wpds-color-fg-content-error)',
    color: '#d63638',
    group: 'Content',
  },
  {
    value: 'content-error-weak',
    label: 'Error Weak',
    description: 'Subtle error color',
    cssVar: 'var(--wpds-color-fg-content-error-weak)',
    color: '#e65054',
    group: 'Content',
  },
  {
    value: 'content-success',
    label: 'Success',
    description: 'Success state color',
    cssVar: 'var(--wpds-color-fg-content-success)',
    color: '#00a32a',
    group: 'Content',
  },
  {
    value: 'content-success-weak',
    label: 'Success Weak',
    description: 'Subtle success color',
    cssVar: 'var(--wpds-color-fg-content-success-weak)',
    color: '#00ba37',
    group: 'Content',
  },
  {
    value: 'content-caution',
    label: 'Caution',
    description: 'Caution/warning color',
    cssVar: 'var(--wpds-color-fg-content-caution)',
    color: '#f0b849',
    group: 'Content',
  },
  {
    value: 'content-caution-weak',
    label: 'Caution Weak',
    description: 'Subtle caution color',
    cssVar: 'var(--wpds-color-fg-content-caution-weak)',
    color: '#f2c765',
    group: 'Content',
  },
  {
    value: 'content-info',
    label: 'Info',
    description: 'Informational color',
    cssVar: 'var(--wpds-color-fg-content-info)',
    color: '#0783be',
    group: 'Content',
  },
  {
    value: 'content-info-weak',
    label: 'Info Weak',
    description: 'Subtle info color',
    cssVar: 'var(--wpds-color-fg-content-info-weak)',
    color: '#33b3db',
    group: 'Content',
  },
  {
    value: 'content-warning',
    label: 'Warning',
    description: 'Warning color',
    cssVar: 'var(--wpds-color-fg-content-warning)',
    color: '#f56e28',
    group: 'Content',
  },
  {
    value: 'content-warning-weak',
    label: 'Warning Weak',
    description: 'Subtle warning color',
    cssVar: 'var(--wpds-color-fg-content-warning-weak)',
    color: '#f78b5b',
    group: 'Content',
  },
  // Interactive - Brand
  {
    value: 'interactive-brand',
    label: 'Brand',
    description: 'Interactive brand color',
    cssVar: 'var(--wpds-color-fg-interactive-brand)',
    color: '#3858e9',
    group: 'Interactive',
  },
  {
    value: 'interactive-brand-active',
    label: 'Brand Active',
    description: 'Active brand color',
    cssVar: 'var(--wpds-color-fg-interactive-brand-active)',
    color: '#1e40af',
    group: 'Interactive',
  },
  {
    value: 'interactive-brand-disabled',
    label: 'Brand Disabled',
    description: 'Disabled brand color',
    cssVar: 'var(--wpds-color-fg-interactive-brand-disabled)',
    color: '#a5b3d6',
    group: 'Interactive',
  },
  {
    value: 'interactive-brand-strong',
    label: 'Brand Strong',
    description: 'Strong brand color',
    cssVar: 'var(--wpds-color-fg-interactive-brand-strong)',
    color: '#1e40af',
    group: 'Interactive',
  },
  {
    value: 'interactive-brand-strong-active',
    label: 'Brand Strong Active',
    description: 'Active strong brand color',
    cssVar: 'var(--wpds-color-fg-interactive-brand-strong-active)',
    color: '#1e3a8a',
    group: 'Interactive',
  },
  {
    value: 'interactive-brand-strong-disabled',
    label: 'Brand Strong Disabled',
    description: 'Disabled strong brand color',
    cssVar: 'var(--wpds-color-fg-interactive-brand-strong-disabled)',
    color: '#93a5c7',
    group: 'Interactive',
  },
  // Interactive - Neutral
  {
    value: 'interactive-neutral',
    label: 'Neutral',
    description: 'Interactive neutral color',
    cssVar: 'var(--wpds-color-fg-interactive-neutral)',
    color: '#1e1e1e',
    group: 'Interactive',
  },
  {
    value: 'interactive-neutral-active',
    label: 'Neutral Active',
    description: 'Active neutral color',
    cssVar: 'var(--wpds-color-fg-interactive-neutral-active)',
    color: '#000000',
    group: 'Interactive',
  },
  {
    value: 'interactive-neutral-disabled',
    label: 'Neutral Disabled',
    description: 'Disabled neutral color',
    cssVar: 'var(--wpds-color-fg-interactive-neutral-disabled)',
    color: '#a0a0a0',
    group: 'Interactive',
  },
  {
    value: 'interactive-neutral-strong',
    label: 'Neutral Strong',
    description: 'Strong neutral color',
    cssVar: 'var(--wpds-color-fg-interactive-neutral-strong)',
    color: '#000000',
    group: 'Interactive',
  },
  {
    value: 'interactive-neutral-strong-active',
    label: 'Neutral Strong Active',
    description: 'Active strong neutral color',
    cssVar: 'var(--wpds-color-fg-interactive-neutral-strong-active)',
    color: '#000000',
    group: 'Interactive',
  },
  {
    value: 'interactive-neutral-strong-disabled',
    label: 'Neutral Strong Disabled',
    description: 'Disabled strong neutral color',
    cssVar: 'var(--wpds-color-fg-interactive-neutral-strong-disabled)',
    color: '#8f8f8f',
    group: 'Interactive',
  },
  {
    value: 'interactive-neutral-weak',
    label: 'Neutral Weak',
    description: 'Weak neutral color',
    cssVar: 'var(--wpds-color-fg-interactive-neutral-weak)',
    color: '#757575',
    group: 'Interactive',
  },
  {
    value: 'interactive-neutral-weak-disabled',
    label: 'Neutral Weak Disabled',
    description: 'Disabled weak neutral color',
    cssVar: 'var(--wpds-color-fg-interactive-neutral-weak-disabled)',
    color: '#b8b8b8',
    group: 'Interactive',
  },
];

// Helper function to determine if a color is light or dark
function isLightColor(hexColor: string): boolean {
  // Convert hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate relative luminance using the formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return true if light (luminance > 0.5)
  return luminance > 0.5;
}

export const ColorVariantPicker: React.FC<ColorVariantPickerProps> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentVariant = COLOR_VARIANTS.find(v => v.value === value) || COLOR_VARIANTS[0];

  // Group and filter colors
  const groupedColors = useMemo(() => {
    let filtered = COLOR_VARIANTS;

    // Filter by search term
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = COLOR_VARIANTS.filter(variant =>
        variant.label.toLowerCase().includes(lowerSearch) ||
        variant.description.toLowerCase().includes(lowerSearch) ||
        variant.value.toLowerCase().includes(lowerSearch)
      );
    }

    // Group by category
    const grouped: Record<string, ColorVariant[]> = {};
    filtered.forEach(variant => {
      if (!grouped[variant.group]) {
        grouped[variant.group] = [];
      }
      grouped[variant.group].push(variant);
    });

    return grouped;
  }, [searchTerm]);

  return (
    <div style={{ marginBottom: '16px', position: 'relative' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
        {label || 'Color Variant'}
      </label>

      <Button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        variant="secondary"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '8px',
          padding: '8px 12px',
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '3px',
            backgroundColor: currentVariant.color,
            border: '1px solid rgba(0, 0, 0, 0.1)',
            flexShrink: 0,
          }}
        />
        <span style={{ flex: 1, textAlign: 'left', fontSize: '13px' }}>
          {currentVariant.label}
        </span>
      </Button>

      {isOpen && buttonRef.current ? (
        <Popover
          isOpen={isOpen}
          onClose={() => {
            setIsOpen(false);
            setSearchTerm('');
          }}
          anchorRect={buttonRef.current!.getBoundingClientRect()}
        >
          <div
            style={{
              width: '300px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '500px',
            }}
          >
            <div style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>
              <SearchControl
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search colors..."
                __nextHasNoMarginBottom
              />
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
              {Object.entries(groupedColors).map(([groupName, variants]) => (
                <div key={groupName} style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: '#666',
                      marginBottom: '6px',
                      padding: '4px 8px',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {groupName}
                  </div>

                  {variants.map(variant => {
                    const isSelected = value === variant.value;

                    return (
                      <button
                        key={variant.value}
                        onClick={() => {
                          onChange(variant.value);
                          setIsOpen(false);
                          setSearchTerm('');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '2px',
                          backgroundColor: isSelected ? 'rgba(56, 88, 233, 0.1)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background-color 0.1s',
                          width: '100%',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = '#f5f5f5';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '4px',
                            backgroundColor: variant.color,
                            border: '1px solid rgba(0, 0, 0, 0.1)',
                            flexShrink: 0,
                            position: 'relative',
                          }}
                        >
                          {isSelected && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                color: isLightColor(variant.color) ? '#000' : '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Icon icon={check} size={14} />
                            </div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: '#1e1e1e' }}>
                            {variant.label}
                          </div>
                          <div style={{ fontSize: '10px', color: '#666', marginTop: '1px' }}>
                            {variant.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}

              {Object.keys(groupedColors).length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                  No colors found
                </div>
              )}
            </div>
          </div>
        </Popover>
      ) : null}
    </div>
  );
};
