/**
 * Layout Controls: Figma-Style Auto Layout UI Components
 *
 * Designer-friendly controls for VStack/HStack containers that hide
 * low-level flex implementation details.
 */

import React from 'react';
import {
  Button,
  __experimentalNumberControl as NumberControl,
  Tooltip,
} from '@wordpress/components';
import {
  info,
  justifyLeft,
  justifyCenter,
  justifyRight,
  justifySpaceBetween,
  justifyStretch,
  justifyTop,
  arrowDown,
  arrowRight,
  justifyCenterVertical,
  justifyBottom,
  justifyStretchVertical,
} from '@wordpress/icons';
import {
  ResizingBehavior,
  PrimaryAlign,
  CrossAlign,
} from '@/src/utils/layoutMappings';

// ============================================================================
// Resizing Control (Hug vs Fill)
// ============================================================================

interface ResizingControlProps {
  label: string;
  value: ResizingBehavior;
  onChange: (value: ResizingBehavior) => void;
  showWarning?: boolean;
  warningMessage?: string;
}

export const ResizingControl: React.FC<ResizingControlProps> = ({
  label,
  value,
  onChange,
  showWarning,
  warningMessage,
}) => {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '6px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#1e1e1e',
          }}
        >
          {label}
        </span>
        {showWarning && warningMessage && (
          <Tooltip text={warningMessage} placement="top">
            <Button
              icon={info}
              size="small"
              style={{
                minWidth: '16px',
                height: '16px',
                padding: '0',
                color: '#f0b429',
              }}
            />
          </Tooltip>
        )}
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <Button
          onClick={() => onChange('hug')}
          style={{
            flex: 1,
            height: '32px',
            justifyContent: 'center',
            fontSize: '12px',
            backgroundColor: value === 'hug' ? '#1e1e1e' : 'transparent',
            color: value === 'hug' ? '#fff' : '#1e1e1e',
            border: '1px solid #ddd',
          }}
        >
          Hug
        </Button>
        <Button
          onClick={() => onChange('fill')}
          style={{
            flex: 1,
            height: '32px',
            justifyContent: 'center',
            fontSize: '12px',
            backgroundColor: value === 'fill' ? '#1e1e1e' : 'transparent',
            color: value === 'fill' ? '#fff' : '#1e1e1e',
            border: '1px solid #ddd',
          }}
        >
          Fill
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// Alignment Control (Visual Icon Buttons)
// ============================================================================

interface AlignmentControlProps {
  label: string;
  value: PrimaryAlign | CrossAlign;
  onChange: (value: PrimaryAlign | CrossAlign) => void;
  options: Array<{
    value: PrimaryAlign | CrossAlign;
    label: string;
    icon: any; // WordPress icon object
  }>;
  direction: 'horizontal' | 'vertical';
}

export const AlignmentControl: React.FC<AlignmentControlProps> = ({
  label,
  value,
  onChange,
  options,
  direction,
}) => {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div
        style={{
          marginBottom: '6px',
          fontSize: '11px',
          fontWeight: 500,
          color: '#1e1e1e',
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          gap: '4px',
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
        }}
      >
        {options.map((option) => (
          <Tooltip key={option.value} text={option.label} placement="top">
            <Button
              icon={option.icon}
              onClick={() => onChange(option.value)}
              style={{
                flex: 1,
                height: '32px',
                minWidth: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  value === option.value ? '#1e1e1e' : 'transparent',
                color: value === option.value ? '#fff' : '#1e1e1e',
                border: '1px solid #ddd',
              }}
            />
          </Tooltip>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Spacing Control (Number Input + Auto)
// ============================================================================

interface SpacingControlProps {
  value: number;
  onChange: (value: number) => void;
  presets?: number[];
}

export const SpacingControl: React.FC<SpacingControlProps> = ({
  value,
  onChange,
  presets = [0, 4, 8, 16, 24, 32],
}) => {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div
        style={{
          marginBottom: '6px',
          fontSize: '11px',
          fontWeight: 500,
          color: '#1e1e1e',
        }}
      >
        Gap
      </div>

      {/* Preset buttons */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap',
        }}
      >
        {presets.map((preset) => (
          <Button
            key={preset}
            size="small"
            onClick={() => onChange(preset)}
            style={{
              height: '24px',
              flex: '1 1 auto',
              minWidth: '0',
              fontSize: '11px',
              backgroundColor: value === preset ? '#1e1e1e' : 'transparent',
              color: value === preset ? '#fff' : '#1e1e1e',
              border: '1px solid #ddd',
              justifyContent: 'center',
            }}
          >
            {preset}
          </Button>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Padding Control (Preset Buttons)
// ============================================================================

interface PaddingControlProps {
  value: string; // CSS padding value like "16px" or "1rem 2rem"
  onChange: (value: string) => void;
  presets?: Array<{ label: string; value: string }>;
}

export const PaddingControl: React.FC<PaddingControlProps> = ({
  value,
  onChange,
  presets = [
    { label: 'None', value: '' },
    { label: 'S', value: '8px' },
    { label: 'M', value: '16px' },
    { label: 'L', value: '24px' },
    { label: 'XL', value: '32px' },
  ],
}) => {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div
        style={{
          marginBottom: '6px',
          fontSize: '11px',
          fontWeight: 500,
          color: '#1e1e1e',
        }}
      >
        Padding
      </div>

      {/* Preset buttons */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap',
        }}
      >
        {presets.map((preset) => (
          <Button
            key={preset.value}
            size="small"
            onClick={() => onChange(preset.value)}
            style={{
              height: '24px',
              flex: '1 1 auto',
              minWidth: '0',
              fontSize: '11px',
              backgroundColor: value === preset.value ? '#1e1e1e' : 'transparent',
              color: value === preset.value ? '#fff' : '#1e1e1e',
              border: '1px solid #ddd',
              justifyContent: 'center',
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Preset Alignment Options
// ============================================================================

/**
 * Primary axis alignment options for VStack (vertical)
 */
export const VSTACK_PRIMARY_OPTIONS = [
  { value: 'start' as PrimaryAlign, label: 'Top', icon: justifyTop },
  { value: 'center' as PrimaryAlign, label: 'Center', icon: justifyCenter },
  { value: 'end' as PrimaryAlign, label: 'Bottom', icon: arrowDown },
  { value: 'space-between' as PrimaryAlign, label: 'Space Between', icon: justifySpaceBetween },
];

/**
 * Cross axis alignment options for VStack (horizontal)
 */
export const VSTACK_CROSS_OPTIONS = [
  { value: 'start' as CrossAlign, label: 'Left', icon: justifyLeft },
  { value: 'center' as CrossAlign, label: 'Center', icon: justifyCenter },
  { value: 'end' as CrossAlign, label: 'Right', icon: justifyRight },
  { value: 'stretch' as CrossAlign, label: 'Stretch', icon: justifyStretch },
];

/**
 * Primary axis alignment options for HStack (horizontal)
 */
export const HSTACK_PRIMARY_OPTIONS = [
  { value: 'start' as PrimaryAlign, label: 'Left', icon: justifyLeft },
  { value: 'center' as PrimaryAlign, label: 'Center', icon: justifyCenter },
  { value: 'end' as PrimaryAlign, label: 'Right', icon: justifyRight },
  { value: 'space-between' as PrimaryAlign, label: 'Space Between', icon: justifySpaceBetween },
];

/**
 * Cross axis alignment options for HStack (vertical)
 */
export const HSTACK_CROSS_OPTIONS = [
  { value: 'start' as CrossAlign, label: 'Top', icon: justifyTop },
  { value: 'center' as CrossAlign, label: 'Center', icon: justifyCenterVertical },
  { value: 'end' as CrossAlign, label: 'Bottom', icon: justifyBottom },
  { value: 'stretch' as CrossAlign, label: 'Stretch', icon: justifyStretchVertical },
];
