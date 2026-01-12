import React from 'react';
import { useComponentTree } from '@/contexts/ComponentTreeContext';
import { ComponentNode } from '../types';
import { ROOT_GRID_ID } from '../utils/treeHelpers';

export const Breadcrumb: React.FC = () => {
  const {
    selectedNodeIds,
    toggleNodeSelection,
    tree,
    editingGlobalComponentId,
    globalComponents,
    setEditingGlobalComponent,
    pages,
    selectedPageId,
    setSelectedPageId,
    currentPageId,
    projects,
    currentProjectId,
  } = useComponentTree();

  // Get current project and page
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const currentPage = pages.find((p) => p.id === currentPageId);
  const selectedPage = selectedPageId ? pages.find((p) => p.id === selectedPageId) : null;

  const getNodePath = (targetId: string | null): ComponentNode[] => {
    if (!targetId) return [];

    const path: ComponentNode[] = [];

    const findPath = (nodes: ComponentNode[], ancestors: ComponentNode[]): boolean => {
      for (const node of nodes) {
        if (node.id === targetId) {
          path.push(...ancestors, node);
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (findPath(node.children, [...ancestors, node])) {
            return true;
          }
        }
      }
      return false;
    };

    findPath(tree, []);
    return path;
  };

  // If editing a global component, show that in breadcrumb
  const editingGlobalComponent = editingGlobalComponentId
    ? globalComponents.find((gc) => gc.id === editingGlobalComponentId)
    : null;

  const componentPath = editingGlobalComponent
    ? [] // Don't show path when editing global component
    : getNodePath(selectedNodeIds.length > 0 ? selectedNodeIds[0] : null);

  // Filter out root grid from path (we'll show page name instead)
  const filteredComponentPath = componentPath.filter((node) => node.id !== ROOT_GRID_ID);

  // Handle project click - deselect page
  const handleProjectClick = () => {
    setSelectedPageId(null);
  };

  // Handle page click - select just the page
  const handlePageClick = () => {
    if (selectedPage) {
      setSelectedPageId(selectedPage.id);
      // Clear component selection
      toggleNodeSelection(ROOT_GRID_ID, false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#fff',
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '0px',
        fontSize: '13px',
        height: '25px',
        flexShrink: 0,
      }}
    >
      {editingGlobalComponent ? (
        <>
          <span style={{ color: '#8b5cf6', fontWeight: 500 }}>
            Global Component: {editingGlobalComponent.name || editingGlobalComponent.type}
          </span>
          <button
            onClick={() => setEditingGlobalComponent(null)}
            style={{
              marginLeft: '12px',
              background: 'transparent',
              border: '1px solid #8b5cf6',
              borderRadius: '3px',
              padding: '2px 8px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#8b5cf6',
            }}
          >
            Exit
          </button>
        </>
      ) : (
        <>
          {/* Project name */}
          <button
            onClick={handleProjectClick}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 400,
              color: '#1e1e1e',
              transition: 'opacity 0.1s ease',
              textDecoration: 'none',
              opacity: selectedPageId || filteredComponentPath.length > 0 ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (selectedPageId || filteredComponentPath.length > 0) {
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedPageId || filteredComponentPath.length > 0) {
                e.currentTarget.style.opacity = '0.7';
              }
            }}
          >
            {currentProject?.name || 'Project'}
          </button>

          {/* Page name (when selected or has component selection) */}
          {(selectedPage || filteredComponentPath.length > 0) && (
            <>
              <span style={{ color: '#8c8f94', margin: '0 6px', fontSize: '12px' }}>›</span>
              <button
                onClick={handlePageClick}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '0',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 400,
                  color: '#1e1e1e',
                  transition: 'opacity 0.1s ease',
                  textDecoration: 'none',
                  opacity: filteredComponentPath.length > 0 ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (filteredComponentPath.length > 0) {
                    e.currentTarget.style.opacity = '1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (filteredComponentPath.length > 0) {
                    e.currentTarget.style.opacity = '0.7';
                  }
                }}
              >
                {selectedPage?.name || currentPage?.name || 'Page'}
              </button>
            </>
          )}

          {/* Component path */}
          {filteredComponentPath.map((node, index) => (
            <React.Fragment key={node.id}>
              <span style={{ color: '#8c8f94', margin: '0 6px', fontSize: '12px' }}>›</span>
              <button
                onClick={() => toggleNodeSelection(node.id, false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '0',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 400,
                  color: '#1e1e1e',
                  transition: 'opacity 0.1s ease',
                  textDecoration: 'none',
                  opacity: index === filteredComponentPath.length - 1 ? 1 : 0.7,
                }}
                onMouseEnter={(e) => {
                  if (index !== filteredComponentPath.length - 1) {
                    e.currentTarget.style.opacity = '1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (index !== filteredComponentPath.length - 1) {
                    e.currentTarget.style.opacity = '0.7';
                  }
                }}
              >
                {node.name || node.type}
              </button>
            </React.Fragment>
          ))}
        </>
      )}
    </div>
  );
};
