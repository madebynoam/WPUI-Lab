import React from 'react';
import { SearchControl } from '@wordpress/components';
import { patterns, patternCategories } from '../patterns';
import { componentGroups } from './TreePanel';

interface ComponentInserterProps {
  showInserter: boolean;
  onCloseInserter: () => void;
  onAddComponent: (componentType: string) => void;
  onAddPattern: (patternId: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  inserterTab: 'blocks' | 'patterns';
  onTabChange: (tab: 'blocks' | 'patterns') => void;
}

export const ComponentInserter: React.FC<ComponentInserterProps> = ({
  showInserter,
  onCloseInserter,
  onAddComponent,
  onAddPattern,
  searchTerm,
  onSearchChange,
  inserterTab,
  onTabChange,
}) => {
  if (!showInserter) {
    return null;
  }

  // Filter components based on search term
  const filteredGroups = componentGroups
    .map((group) => ({
      ...group,
      components: group.components.filter((comp) =>
        comp.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((group) => group.components.length > 0);

  // Filter patterns based on search term
  const filteredPatternCategories = patternCategories
    .map((category) => ({
      category,
      patterns: patterns.filter(
        (p) =>
          p.category === category &&
          (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    }))
    .filter((cat) => cat.patterns.length > 0);

  const handleAddComponent = (componentType: string) => {
    onAddComponent(componentType);
    onCloseInserter();
    onSearchChange('');
  };

  const handleAddPattern = (patternId: string) => {
    onAddPattern(patternId);
    onCloseInserter();
    onSearchChange('');
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        borderTop: '1px solid #e0e0e0',
      }}
    >
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#f9f9f9',
        }}
      >
        <button
          onClick={() => onTabChange('blocks')}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            backgroundColor: inserterTab === 'blocks' ? '#fff' : 'transparent',
            borderBottom:
              inserterTab === 'blocks'
                ? '2px solid #2271b1'
                : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: inserterTab === 'blocks' ? 600 : 400,
            color: inserterTab === 'blocks' ? '#1e1e1e' : '#666',
            fontFamily: 'inherit',
          }}
        >
          Blocks
        </button>
        <button
          onClick={() => onTabChange('patterns')}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            backgroundColor:
              inserterTab === 'patterns' ? '#fff' : 'transparent',
            borderBottom:
              inserterTab === 'patterns'
                ? '2px solid #2271b1'
                : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: inserterTab === 'patterns' ? 600 : 400,
            color: inserterTab === 'patterns' ? '#1e1e1e' : '#666',
            fontFamily: 'inherit',
          }}
        >
          Patterns
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
        <SearchControl
          value={searchTerm}
          onChange={onSearchChange}
          placeholder={
            inserterTab === 'blocks'
              ? 'Search blocks...'
              : 'Search patterns...'
          }
          __nextHasNoMarginBottom
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {inserterTab === 'blocks' ? (
          filteredGroups.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '24px',
                color: '#757575',
                fontSize: '13px',
              }}
            >
              No blocks found
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.name} style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '12px',
                    color: '#757575',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  {typeof group.icon === 'string' ? group.icon : ''}
                  {group.name}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                  }}
                >
                  {group.components.map((comp) => (
                    <button
                      key={comp}
                      onClick={() => handleAddComponent(comp)}
                      style={{
                        padding: '12px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        fontSize: '12px',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#2271b1';
                        e.currentTarget.style.boxShadow =
                          '0 2px 4px rgba(0, 0, 0, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e0e0e0';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {comp}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )
        ) : filteredPatternCategories.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '24px',
              color: '#757575',
              fontSize: '13px',
            }}
          >
            No patterns found
          </div>
        ) : (
          filteredPatternCategories.map((cat) => (
            <div key={cat.category} style={{ marginBottom: '24px' }}>
              <div
                style={{
                  marginBottom: '12px',
                  color: '#757575',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {cat.category}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cat.patterns.map((pattern) => (
                  <button
                    key={pattern.id}
                    onClick={() => handleAddPattern(pattern.id)}
                    style={{
                      padding: '12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      fontSize: '13px',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#2271b1';
                      e.currentTarget.style.boxShadow =
                        '0 2px 4px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e0e0e0';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 500,
                        color: '#1e1e1e',
                        marginBottom: '4px',
                      }}
                    >
                      {pattern.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {pattern.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
