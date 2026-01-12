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
  cp1: { x: number; y: number };
  cp2: { x: number; y: number };
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
 * Snaps to the CENTER of the chosen edge for cleaner connections
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

  // Choose the edge based on relative direction, and snap to that edge's center
  const dx = fromPt.x - centerX;
  const dy = fromPt.y - centerY;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Favor horizontal edges when horizontal delta dominates
    if (dx > 0) {
      return { x: right, y: centerY, edge: 'right' };
    }
    return { x: left, y: centerY, edge: 'left' };
  }

  // Otherwise favor vertical edges
  if (dy > 0) {
    return { x: centerX, y: bottom, edge: 'bottom' };
  }
  return { x: centerX, y: top, edge: 'top' };
}

/**
 * Create a smooth bezier curve between two points
 * Returns path string and control points for arrow alignment
 */
function createBezierPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromEdge?: 'top' | 'right' | 'bottom' | 'left',
  toEdge?: 'top' | 'right' | 'bottom' | 'left'
): { path: string; cp1: { x: number; y: number }; cp2: { x: number; y: number } } {
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

  return {
    path: `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`,
    cp1: { x: cp1x, y: cp1y },
    cp2: { x: cp2x, y: cp2y },
  };
}

/**
 * Calculate arrowhead points - returns a filled triangle
 * The arrow points in the direction of travel (from control point to endpoint)
 */
function calculateArrowhead(
  tipX: number,
  tipY: number,
  fromX: number,
  fromY: number,
  size: number
): { x1: number; y1: number; x2: number; y2: number; baseX: number; baseY: number } {
  // Direction from control point to tip
  const dx = tipX - fromX;
  const dy = tipY - fromY;
  const len = Math.hypot(dx, dy);
  
  if (len === 0) {
    return { x1: tipX, y1: tipY - size, x2: tipX, y2: tipY + size, baseX: tipX, baseY: tipY };
  }
  
  // Normalized direction vector
  const nx = dx / len;
  const ny = dy / len;
  
  // Perpendicular vector
  const px = -ny;
  const py = nx;
  
  // Arrow dimensions - length and half-width
  const arrowLength = size * 1.2;
  const arrowHalfWidth = size * 0.5;
  
  // Base of arrow (pulled back from tip)
  const baseX = tipX - nx * arrowLength;
  const baseY = tipY - ny * arrowLength;
  
  // Two corners of the arrow base
  return {
    x1: baseX + px * arrowHalfWidth,
    y1: baseY + py * arrowHalfWidth,
    x2: baseX - px * arrowHalfWidth,
    y2: baseY - py * arrowHalfWidth,
    baseX,
    baseY,
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
  // Store component bounds RELATIVE to their page (not absolute)
  // This way we only need to re-query DOM when layout changes, not when pages move
  const [relativeComponentBounds, setRelativeComponentBounds] = useState<Record<string, {
    pageId: string;
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

  // Query DOM for component bounds RELATIVE to their page
  useEffect(() => {
    const updateBounds = () => {
      const bounds: Record<string, {
        pageId: string;
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
            // Store RELATIVE bounds (not absolute) - we'll add page position later
            const left = (compRect.left - pageRect.left) / zoom;
            const right = (compRect.right - pageRect.left) / zoom;
            const top = (compRect.top - pageRect.top) / zoom;
            const bottom = (compRect.bottom - pageRect.top) / zoom;

            bounds[conn.sourceComponentId] = {
              pageId: conn.sourcePageId,
              left,
              right,
              top,
              bottom,
              centerX: (left + right) / 2,
              centerY: (top + bottom) / 2,
            };
          }
        }
      });

      setRelativeComponentBounds(bounds);
    };

    // Debounce updates - only for DOM queries, not position updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(updateBounds, 100);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [connections, thumbWidth, thumbHeight, contentScale, zoom]);

  // Calculate absolute component bounds using live page positions
  // This runs on every render when pagePositions change (during drag)
  const componentBounds = useMemo(() => {
    const absoluteBounds: Record<string, {
      left: number;
      right: number;
      top: number;
      bottom: number;
      centerX: number;
      centerY: number;
    }> = {};

    Object.entries(relativeComponentBounds).forEach(([componentId, relBounds]) => {
      const pagePos = pagePositions[relBounds.pageId];
      if (pagePos) {
        absoluteBounds[componentId] = {
          left: pagePos.x + relBounds.left,
          right: pagePos.x + relBounds.right,
          top: pagePos.y + relBounds.top,
          bottom: pagePos.y + relBounds.bottom,
          centerX: pagePos.x + relBounds.centerX,
          centerY: pagePos.y + relBounds.centerY,
        };
      }
    });

    return absoluteBounds;
  }, [relativeComponentBounds, pagePositions]);

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

      const { path, cp1, cp2 } = createBezierPath(
        sourcePt,
        targetEdgePt,
        sourceEdge,
        targetEdgePt.edge
      );

      result.push({
        ...conn,
        sourcePt,
        targetPt: targetEdgePt,
        path,
        cp1,
        cp2,
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
        zIndex: 50, // Above selected pages (10) but below dragging pages (1000)
      }}
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
    >
      {renderedConnections.map((connection) => {
        const isHovered = hoveredConnection === connection.id;

        // Fixed sizes - don't scale with zoom for consistent appearance
        const strokeWidth = isHovered ? 3 : 2.5;
        const dotRadius = isHovered ? 5 : 4;
        const arrowSize = 10;

        // Calculate arrowhead pointing in direction of curve (using cp2 for tangent)
        const arrow = calculateArrowhead(
          connection.targetPt.x,
          connection.targetPt.y,
          connection.cp2.x,
          connection.cp2.y,
          arrowSize
        );

        // Create path that ends at arrow base instead of tip
        const shortenedPath = `M ${connection.sourcePt.x} ${connection.sourcePt.y} C ${connection.cp1.x} ${connection.cp1.y}, ${connection.cp2.x} ${connection.cp2.y}, ${arrow.baseX} ${arrow.baseY}`;

        return (
          <g key={connection.id}>
            {/* Invisible wider path for easier clicking */}
            <path
              d={connection.path}
              fill="none"
              stroke="transparent"
              strokeWidth={20}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onMouseEnter={() => setHoveredConnection(connection.id)}
              onMouseLeave={() => setHoveredConnection(null)}
              onClick={() => handleConnectionClick(connection)}
            />

            {/* Visible path - solid line ending at arrow base */}
            <path
              d={shortenedPath}
              fill="none"
              stroke={isHovered ? '#818cf8' : '#6366f1'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              style={{
                pointerEvents: 'none',
              }}
            />

            {/* Arrowhead - filled triangle pointing forward */}
            <path
              d={`M ${connection.targetPt.x} ${connection.targetPt.y} L ${arrow.x1} ${arrow.y1} L ${arrow.x2} ${arrow.y2} Z`}
              fill={isHovered ? '#818cf8' : '#6366f1'}
              stroke="none"
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
