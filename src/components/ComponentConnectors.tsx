'use client';

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Page, ComponentNode, Interaction } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface ComponentConnectorsProps {
  pages: Page[];
  pagePositions: Record<string, { x: number; y: number }>;
  thumbWidth: number;
  thumbHeight: number;
  contentScale: number;
  zoom: number;
}

interface Connection {
  id: string;
  sourcePageId: string;
  targetPageId: string;
  sourceComponentId: string;
  interaction: Interaction;
}

interface RenderedConnection extends Connection {
  sourcePt: { x: number; y: number };
  targetPt: { x: number; y: number };
  path: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Find all navigation interactions in a component tree
 */
function findNavigationInteractions(
  node: ComponentNode,
  pageId: string,
  connections: Connection[]
): void {
  if (node.interactions) {
    node.interactions.forEach((interaction) => {
      if (interaction.action === 'navigate' && interaction.targetId) {
        connections.push({
          id: `${pageId}-${node.id}-${interaction.id}`,
          sourcePageId: pageId,
          targetPageId: interaction.targetId,
          sourceComponentId: node.id,
          interaction,
        });
      }
    });
  }

  if (node.children) {
    node.children.forEach((child) => {
      findNavigationInteractions(child, pageId, connections);
    });
  }
}

/**
 * Get center point of a page
 */
function getPageCenter(
  pageId: string,
  pagePositions: Record<string, { x: number; y: number }>,
  thumbWidth: number,
  thumbHeight: number
): { x: number; y: number } {
  const pos = pagePositions[pageId];
  if (!pos) return { x: 0, y: 0 };
  return {
    x: pos.x + thumbWidth / 2,
    y: pos.y + thumbHeight / 2,
  };
}

/**
 * Find the best edge point on a page given a source point
 */
function getPageEdgePoint(
  pageId: string,
  pagePositions: Record<string, { x: number; y: number }>,
  thumbWidth: number,
  thumbHeight: number,
  fromPt: { x: number; y: number }
): { x: number; y: number; edge: 'top' | 'right' | 'bottom' | 'left' } {
  const pos = pagePositions[pageId];
  if (!pos) return { x: 0, y: 0, edge: 'left' };

  const left = pos.x;
  const right = pos.x + thumbWidth;
  const top = pos.y;
  const bottom = pos.y + thumbHeight;
  const centerX = pos.x + thumbWidth / 2;
  const centerY = pos.y + thumbHeight / 2;

  // Determine which edge the line would intersect
  const dx = fromPt.x - centerX;
  const dy = fromPt.y - centerY;
  const angle = Math.atan2(dy, dx);
  const cornerAngle = Math.atan2(thumbHeight / 2, thumbWidth / 2);

  if (angle >= -cornerAngle && angle < cornerAngle) {
    // Right edge
    const t = (right - centerX) / dx;
    return { x: right, y: centerY + dy * t, edge: 'right' };
  } else if (angle >= cornerAngle && angle < Math.PI - cornerAngle) {
    // Bottom edge
    const t = (bottom - centerY) / dy;
    return { x: centerX + dx * t, y: bottom, edge: 'bottom' };
  } else if (angle >= Math.PI - cornerAngle || angle < -Math.PI + cornerAngle) {
    // Left edge
    const t = (left - centerX) / dx;
    return { x: left, y: centerY + dy * t, edge: 'left' };
  } else {
    // Top edge
    const t = (top - centerY) / dy;
    return { x: centerX + dx * t, y: top, edge: 'top' };
  }
}

/**
 * Create a smooth bezier curve between two points
 */
function createBezierPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromEdge?: 'top' | 'right' | 'bottom' | 'left',
  toEdge?: 'top' | 'right' | 'bottom' | 'left'
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const curvature = Math.min(distance * 0.4, 100);

  // Control point offsets based on edges
  let cp1x = from.x;
  let cp1y = from.y;
  let cp2x = to.x;
  let cp2y = to.y;

  // Offset control point 1 based on source edge
  if (fromEdge === 'right') cp1x += curvature;
  else if (fromEdge === 'left') cp1x -= curvature;
  else if (fromEdge === 'bottom') cp1y += curvature;
  else if (fromEdge === 'top') cp1y -= curvature;
  else {
    // Default: curve away from target
    cp1x += dx * 0.3;
    cp1y += dy * 0.1;
  }

  // Offset control point 2 based on target edge
  if (toEdge === 'right') cp2x += curvature;
  else if (toEdge === 'left') cp2x -= curvature;
  else if (toEdge === 'bottom') cp2y += curvature;
  else if (toEdge === 'top') cp2y -= curvature;

  return `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;
}

/**
 * Calculate arrowhead points
 */
function calculateArrowhead(
  x: number,
  y: number,
  fromX: number,
  fromY: number,
  size: number
): { x1: number; y1: number; x2: number; y2: number } {
  const angle = Math.atan2(y - fromY, x - fromX);
  const angle1 = angle + Math.PI * 0.8;
  const angle2 = angle - Math.PI * 0.8;
  return {
    x1: x + Math.cos(angle1) * size,
    y1: y + Math.sin(angle1) * size,
    x2: x + Math.cos(angle2) * size,
    y2: y + Math.sin(angle2) * size,
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ComponentConnectors: React.FC<ComponentConnectorsProps> = ({
  pages,
  pagePositions,
  thumbWidth,
  thumbHeight,
  contentScale,
  zoom,
}) => {
  // Store component bounds (not just center) so we can draw from the correct edge
  const [componentBounds, setComponentBounds] = useState<Record<string, {
    left: number;
    right: number;
    top: number;
    bottom: number;
    centerX: number;
    centerY: number;
  }>>({});
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Gather all connections from all pages
  const connections = useMemo(() => {
    const result: Connection[] = [];
    pages.forEach((page) => {
      page.tree.forEach((node) => {
        findNavigationInteractions(node, page.id, result);
      });
    });
    return result;
  }, [pages]);

  // Query DOM for component bounds
  useEffect(() => {
    const updateBounds = () => {
      const bounds: Record<string, {
        left: number;
        right: number;
        top: number;
        bottom: number;
        centerX: number;
        centerY: number;
      }> = {};

      connections.forEach((conn) => {
        // Find the component element within the page
        const componentEl = document.querySelector(
          `[data-component-id="${conn.sourceComponentId}"]`
        ) as HTMLElement;

        if (componentEl) {
          // Find the page container (ancestor with the page content)
          const pageContainer = componentEl.closest('.project-canvas-page-thumb');

          if (pageContainer) {
            const pageRect = pageContainer.getBoundingClientRect();
            const compRect = componentEl.getBoundingClientRect();

            // Calculate bounds relative to page container in screen pixels, then convert to canvas coords
            const left = (compRect.left - pageRect.left) / zoom;
            const right = (compRect.right - pageRect.left) / zoom;
            const top = (compRect.top - pageRect.top) / zoom;
            const bottom = (compRect.bottom - pageRect.top) / zoom;

            // Get page position in canvas coords
            const pagePos = pagePositions[conn.sourcePageId];
            if (pagePos) {
              bounds[conn.sourceComponentId] = {
                left: pagePos.x + left,
                right: pagePos.x + right,
                top: pagePos.y + top,
                bottom: pagePos.y + bottom,
                centerX: pagePos.x + (left + right) / 2,
                centerY: pagePos.y + (top + bottom) / 2,
              };
            }
          }
        }
      });

      setComponentBounds(bounds);
    };

    // Debounce updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(updateBounds, 100);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [connections, pagePositions, thumbWidth, thumbHeight, contentScale, zoom]);

  // Build rendered connections
  const renderedConnections = useMemo(() => {
    const result: RenderedConnection[] = [];

    connections.forEach((conn) => {
      // Skip self-connections
      if (conn.sourcePageId === conn.targetPageId) return;

      // Get component bounds (or fallback to page center)
      const compBounds = componentBounds[conn.sourceComponentId];

      // First, get target page center to determine direction
      const targetPageCenter = getPageCenter(
        conn.targetPageId,
        pagePositions,
        thumbWidth,
        thumbHeight
      );

      // Calculate source point from component edge based on target direction
      let sourcePt: { x: number; y: number };
      let sourceEdge: 'top' | 'right' | 'bottom' | 'left' | undefined;

      if (compBounds) {
        // Determine which edge to draw from based on target direction
        const dx = targetPageCenter.x - compBounds.centerX;
        const dy = targetPageCenter.y - compBounds.centerY;

        if (Math.abs(dx) > Math.abs(dy)) {
          // Target is more horizontal - use left or right edge
          if (dx > 0) {
            sourceEdge = 'right';
            sourcePt = { x: compBounds.right, y: compBounds.centerY };
          } else {
            sourceEdge = 'left';
            sourcePt = { x: compBounds.left, y: compBounds.centerY };
          }
        } else {
          // Target is more vertical - use top or bottom edge
          if (dy > 0) {
            sourceEdge = 'bottom';
            sourcePt = { x: compBounds.centerX, y: compBounds.bottom };
          } else {
            sourceEdge = 'top';
            sourcePt = { x: compBounds.centerX, y: compBounds.top };
          }
        }
      } else {
        // Fallback to page center if component bounds not available
        sourcePt = getPageCenter(
          conn.sourcePageId,
          pagePositions,
          thumbWidth,
          thumbHeight
        );
      }

      // Get target position (page edge closest to source)
      const targetEdgePt = getPageEdgePoint(
        conn.targetPageId,
        pagePositions,
        thumbWidth,
        thumbHeight,
        sourcePt
      );

      const path = createBezierPath(sourcePt, targetEdgePt, sourceEdge, targetEdgePt.edge);

      result.push({
        ...conn,
        sourcePt,
        targetPt: targetEdgePt,
        path,
      });
    });

    return result;
  }, [connections, componentBounds, pagePositions, thumbWidth, thumbHeight]);

  // Calculate SVG bounds
  const bounds = useMemo(() => {
    if (renderedConnections.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    renderedConnections.forEach((conn) => {
      minX = Math.min(minX, conn.sourcePt.x, conn.targetPt.x);
      minY = Math.min(minY, conn.sourcePt.y, conn.targetPt.y);
      maxX = Math.max(maxX, conn.sourcePt.x, conn.targetPt.x);
      maxY = Math.max(maxY, conn.sourcePt.y, conn.targetPt.y);
    });

    // Add padding for curves and arrowheads
    const padding = 100;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  }, [renderedConnections]);

  const handleConnectionClick = useCallback((connection: RenderedConnection) => {
    console.log('Connection clicked:', connection);
  }, []);

  if (renderedConnections.length === 0) {
    return null;
  }

  return (
    <svg
      style={{
        position: 'absolute',
        top: bounds.y,
        left: bounds.x,
        width: bounds.width,
        height: bounds.height,
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 2,
      }}
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
    >
      {renderedConnections.map((connection) => {
        const isHovered = hoveredConnection === connection.id;

        // Counter-scale sizes to appear constant regardless of zoom
        const strokeWidth = (isHovered ? 2 : 1.5) / zoom;
        const dotRadius = (isHovered ? 5 : 4) / zoom;
        const arrowSize = 8 / zoom;
        const dashArray = `${6 / zoom} ${3 / zoom}`;

        // Calculate arrowhead
        const arrow = calculateArrowhead(
          connection.targetPt.x,
          connection.targetPt.y,
          connection.sourcePt.x,
          connection.sourcePt.y,
          arrowSize
        );

        return (
          <g key={connection.id}>
            {/* Invisible wider path for easier clicking */}
            <path
              d={connection.path}
              fill="none"
              stroke="transparent"
              strokeWidth={20 / zoom}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onMouseEnter={() => setHoveredConnection(connection.id)}
              onMouseLeave={() => setHoveredConnection(null)}
              onClick={() => handleConnectionClick(connection)}
            />

            {/* Visible path */}
            <path
              d={connection.path}
              fill="none"
              stroke={isHovered ? '#818cf8' : '#6366f1'}
              strokeWidth={strokeWidth}
              strokeDasharray={isHovered ? 'none' : dashArray}
              style={{
                transition: 'stroke 0.15s ease',
                pointerEvents: 'none',
              }}
            />

            {/* Arrowhead */}
            <path
              d={`M ${arrow.x1} ${arrow.y1} L ${connection.targetPt.x} ${connection.targetPt.y} L ${arrow.x2} ${arrow.y2}`}
              fill="none"
              stroke={isHovered ? '#818cf8' : '#6366f1'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: 'none' }}
            />

            {/* Connection dot at source */}
            <circle
              cx={connection.sourcePt.x}
              cy={connection.sourcePt.y}
              r={dotRadius}
              fill={isHovered ? '#818cf8' : '#6366f1'}
              style={{ transition: 'fill 0.15s ease' }}
            />
          </g>
        );
      })}
    </svg>
  );
};
