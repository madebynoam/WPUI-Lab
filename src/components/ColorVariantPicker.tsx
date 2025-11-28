import React, { useState, useRef } from 'react';
import { Popover, Button } from '@wordpress/components';
import { Icon } from '@wordpress/components';
import { check } from '@wordpress/icons';

interface ColorVariantPickerProps {
  value: string;
  onChange: (colorVariant: string) => void;
  label?: string;
}

// Color variant definitions with their CSS variables and display info
const COLOR_VARIANTS = [
  {
    value: 'default',
    label: 'Default',
    description: 'Inherits current text color',
    cssVar: 'currentColor',
  },
  {
    value: 'brand',
    label: 'Brand',
    description: 'Interactive brand color',
    cssVar: 'var(--wpds-color-fg-interactive-brand)',
  },
  {
    value: 'neutral',
    label: 'Neutral',
    description: 'Standard content color',
    cssVar: 'var(--wpds-color-fg-content-neutral)',
  },
  {
    value: 'neutral-weak',
    label: 'Neutral Weak',
    description: 'Subtle content color',
    cssVar: 'var(--wpds-color-fg-content-neutral-weak)',
  },
  {
    value: 'error',
    label: 'Error',
    description: 'Error state color',
    cssVar: 'var(--wpds-color-fg-content-error)',
  },
  {
    value: 'success',
    label: 'Success',
    description: 'Success state color',
    cssVar: 'var(--wpds-color-fg-content-success)',
  },
  {
    value: 'caution',
    label: 'Caution',
    description: 'Warning/caution color',
    cssVar: 'var(--wpds-color-fg-content-caution)',
  },
  {
    value: 'info',
    label: 'Info',
    description: 'Informational color',
    cssVar: 'var(--wpds-color-fg-content-info)',
  },
];

export const ColorVariantPicker: React.FC<ColorVariantPickerProps> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentVariant = COLOR_VARIANTS.find(v => v.value === value) || COLOR_VARIANTS[0];

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
            backgroundColor: currentVariant.cssVar,
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
          onClose={() => setIsOpen(false)}
          anchorRect={buttonRef.current!.getBoundingClientRect()}
        >
          <div
            style={{
              width: '280px',
              display: 'flex',
              flexDirection: 'column',
              padding: '8px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: '#666',
                marginBottom: '8px',
                padding: '4px 8px',
                letterSpacing: '0.5px',
              }}
            >
              Semantic Colors
            </div>

            {COLOR_VARIANTS.map(variant => {
              const isSelected = value === variant.value;

              return (
                <button
                  key={variant.value}
                  onClick={() => {
                    onChange(variant.value);
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
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
                      width: '32px',
                      height: '32px',
                      borderRadius: '4px',
                      backgroundColor: variant.cssVar,
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
                          color: variant.value === 'default' ? '#000' : '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon icon={check} size={16} />
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#1e1e1e' }}>
                      {variant.label}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                      {variant.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Popover>
      ) : null}
    </div>
  );
};
