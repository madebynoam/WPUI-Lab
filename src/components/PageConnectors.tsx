'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { Page, ComponentNode, Interaction } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface PageConnectorsProps {
  pages: Page[];
  pagePositions: Record<string, { x: number; y: number }>;
  thumbWidth: number;
  thumbHeight: number;
}

// Which edge of a page rectangle
type Edge = 'top' | 'right' | 'bottom' | 'left';

// A point in 2D space
interface Point {
  x: number;
  y: number;
}

// A connection point on a page edge
interface Port {
  pageId: string;
  edge: Edge;
  position: number; // 0-1 along the edge (0.5 = center)
  x: number; // Absolute canvas coordinates
  y: number;
}

// Bounding box for obstacle detection
interface PageBounds {
  pageId: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  center: Point;
}

// Raw connection data from the tree
interface Connection {
  id: string;
  sourcePageId: string;
  targetPageId: string;
  sourceComponentId: string;
  interaction: Interaction;
}

// Connection with selected edges
interface ConnectionWithEdges extends Connection {
  sourceEdge: Edge;
  targetEdge: Edge;
}

// A connection with its fully calculated route
interface RoutedConnection extends ConnectionWithEdges {
  sourcePort: Port;
  targetPort: Port;
  path: string; // SVG path string
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Build bounding box for a page
 */
function getPageBounds(
  pageId: string,
  position: Point,
  width: number,
  height: number
): PageBounds {
  return {
    pageId,
    left: position.x,
    top: position.y,
    right: position.x + width,
    bottom: position.y + height,
    center: {
      x: position.x + width / 2,
      y: position.y + height / 2,
    },
  };
}

/**
 * Get the center point of an edge
 */
function getEdgeCenter(bounds: PageBounds, edge: Edge): Point {
  switch (edge) {
    case 'top':
      return { x: (bounds.left + bounds.right) / 2, y: bounds.top };
    case 'right':
      return { x: bounds.right, y: (bounds.top + bounds.bottom) / 2 };
    case 'bottom':
      return { x: (bounds.left + bounds.right) / 2, y: bounds.bottom };
    case 'left':
      return { x: bounds.left, y: (bounds.top + bounds.bottom) / 2 };
  }
}

/**
 * Get a point at a specific position along an edge (0-1)
 */
function getPointOnEdge(bounds: PageBounds, edge: Edge, position: number): Point {
  switch (edge) {
    case 'top':
      return {
        x: bounds.left + (bounds.right - bounds.left) * position,
        y: bounds.top,
      };
    case 'right':
      return {
        x: bounds.right,
        y: bounds.top + (bounds.bottom - bounds.top) * position,
      };
    case 'bottom':
      return {
        x: bounds.left + (bounds.right - bounds.left) * position,
        y: bounds.bottom,
      };
    case 'left':
      return {
        x: bounds.left,
        y: bounds.top + (bounds.bottom - bounds.top) * position,
      };
  }
}

/**
 * Get the length of an edge
 */
function getEdgeLength(bounds: PageBounds, edge: Edge): number {
  if (edge === 'top' || edge === 'bottom') {
    return bounds.right - bounds.left;
  }
  return bounds.bottom - bounds.top;
}

/**
 * Check if two edges are "facing" each other (natural connection direction)
 */
function areEdgesFacing(
  sourceEdge: Edge,
  targetEdge: Edge,
  sourceBounds: PageBounds,
  targetBounds: PageBounds
): boolean {
  // Facing pairs: right→left, left→right, bottom→top, top→bottom
  if (sourceEdge === 'right' && targetEdge === 'left') {
    return sourceBounds.right < targetBounds.left;
  }
  if (sourceEdge === 'left' && targetEdge === 'right') {
    return sourceBounds.left > targetBounds.right;
  }
  if (sourceEdge === 'bottom' && targetEdge === 'top') {
    return sourceBounds.bottom < targetBounds.top;
  }
  if (sourceEdge === 'top' && targetEdge === 'bottom') {
    return sourceBounds.top > targetBounds.bottom;
  }
  return false;
}

/**
 * Check if a line segment intersects a rectangle
 */
function lineIntersectsRect(p1: Point, p2: Point, rect: PageBounds): boolean {
  // Check if either point is inside the rect
  if (
    (p1.x >= rect.left && p1.x <= rect.right && p1.y >= rect.top && p1.y <= rect.bottom) ||
    (p2.x >= rect.left && p2.x <= rect.right && p2.y >= rect.top && p2.y <= rect.bottom)
  ) {
    return true;
  }

  // Check intersection with each edge of the rectangle
  const edges = [
    { a: { x: rect.left, y: rect.top }, b: { x: rect.right, y: rect.top } }, // top
    { a: { x: rect.right, y: rect.top }, b: { x: rect.right, y: rect.bottom } }, // right
    { a: { x: rect.left, y: rect.bottom }, b: { x: rect.right, y: rect.bottom } }, // bottom
    { a: { x: rect.left, y: rect.top }, b: { x: rect.left, y: rect.bottom } }, // left
  ];

  for (const edge of edges) {
    if (lineSegmentsIntersect(p1, p2, edge.a, edge.b)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if two line segments intersect
 */
function lineSegmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  if (d1 === 0 && onSegment(p3, p4, p1)) return true;
  if (d2 === 0 && onSegment(p3, p4, p2)) return true;
  if (d3 === 0 && onSegment(p1, p2, p3)) return true;
  if (d4 === 0 && onSegment(p1, p2, p4)) return true;

  return false;
}

function direction(p1: Point, p2: Point, p3: Point): number {
  return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
}

function onSegment(p1: Point, p2: Point, p: Point): boolean {
  return (
    Math.min(p1.x, p2.x) <= p.x &&
    p.x <= Math.max(p1.x, p2.x) &&
    Math.min(p1.y, p2.y) <= p.y &&
    p.y <= Math.max(p1.y, p2.y)
  );
}

/**
 * Find all pages that a line would cross through
 */
function findCrossedPages(
  p1: Point,
  p2: Point,
  allBounds: PageBounds[],
  excludePageIds: string[]
): PageBounds[] {
  return allBounds.filter(
    (bounds) =>
      !excludePageIds.includes(bounds.pageId) && lineIntersectsRect(p1, p2, bounds)
  );
}

/**
 * Get the direction vector for extending from an edge
 */
function getEdgeDirection(edge: Edge): Point {
  switch (edge) {
    case 'top':
      return { x: 0, y: -1 };
    case 'right':
      return { x: 1, y: 0 };
    case 'bottom':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
  }
}

// =============================================================================
// TREE TRAVERSAL
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

// =============================================================================
// CORE ALGORITHM - EDGE SELECTION
// =============================================================================

const ALL_EDGES: Edge[] = ['top', 'right', 'bottom', 'left'];

/**
 * Score an edge pair for a connection
 */
function scoreEdgePair(
  sourceEdge: Edge,
  targetEdge: Edge,
  sourceBounds: PageBounds,
  targetBounds: PageBounds,
  allBounds: PageBounds[]
): number {
  const sourcePoint = getEdgeCenter(sourceBounds, sourceEdge);
  const targetPoint = getEdgeCenter(targetBounds, targetEdge);

  let score = 0;

  // Prefer shorter distances
  const distance = Math.hypot(
    targetPoint.x - sourcePoint.x,
    targetPoint.y - sourcePoint.y
  );
  score -= distance * 0.1;

  // Prefer edges that "face" each other (right→left, bottom→top, etc.)
  if (areEdgesFacing(sourceEdge, targetEdge, sourceBounds, targetBounds)) {
    score += 100;
  }

  // Heavily penalize paths that cross through other pages
  const crossedPages = findCrossedPages(sourcePoint, targetPoint, allBounds, [
    sourceBounds.pageId,
    targetBounds.pageId,
  ]);
  score -= crossedPages.length * 500;

  // Penalize awkward angles (e.g., connecting top→top when pages are side by side)
  if (sourceEdge === targetEdge) {
    score -= 50;
  }

  // Bonus for natural flow directions (left-to-right, top-to-bottom)
  if (sourceEdge === 'right' && targetEdge === 'left') {
    score += 20;
  }
  if (sourceEdge === 'bottom' && targetEdge === 'top') {
    score += 15;
  }

  return score;
}

/**
 * Select the optimal edge pair for a connection
 */
function selectOptimalEdges(
  connection: Connection,
  allBounds: PageBounds[],
  boundsMap: Map<string, PageBounds>
): { sourceEdge: Edge; targetEdge: Edge } {
  const sourceBounds = boundsMap.get(connection.sourcePageId);
  const targetBounds = boundsMap.get(connection.targetPageId);

  if (!sourceBounds || !targetBounds) {
    // Fallback to simple heuristic
    return { sourceEdge: 'right', targetEdge: 'left' };
  }

  let bestScore = -Infinity;
  let bestSourceEdge: Edge = 'right';
  let bestTargetEdge: Edge = 'left';

  // Evaluate all 16 combinations
  for (const sourceEdge of ALL_EDGES) {
    for (const targetEdge of ALL_EDGES) {
      const score = scoreEdgePair(
        sourceEdge,
        targetEdge,
        sourceBounds,
        targetBounds,
        allBounds
      );

      if (score > bestScore) {
        bestScore = score;
        bestSourceEdge = sourceEdge;
        bestTargetEdge = targetEdge;
      }
    }
  }

  return { sourceEdge: bestSourceEdge, targetEdge: bestTargetEdge };
}

// =============================================================================
// CORE ALGORITHM - PORT ALLOCATION
// =============================================================================

/**
 * Group connections by a key function
 */
function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

/**
 * Calculate the approach angle for sorting connections on an edge
 */
function getApproachAngle(
  connection: ConnectionWithEdges,
  edge: Edge,
  isSource: boolean,
  boundsMap: Map<string, PageBounds>
): number {
  const thisBounds = boundsMap.get(isSource ? connection.sourcePageId : connection.targetPageId);
  const otherBounds = boundsMap.get(isSource ? connection.targetPageId : connection.sourcePageId);

  if (!thisBounds || !otherBounds) return 0;

  const edgeCenter = getEdgeCenter(thisBounds, edge);
  const otherCenter = otherBounds.center;

  // Calculate angle from edge center to other page center
  return Math.atan2(otherCenter.y - edgeCenter.y, otherCenter.x - edgeCenter.x);
}

/**
 * Allocate ports for connections sharing an edge, spreading them evenly
 */
function allocatePortsOnEdge(
  connections: ConnectionWithEdges[],
  edge: Edge,
  pageBounds: PageBounds,
  boundsMap: Map<string, PageBounds>,
  isSource: boolean
): Map<string, Port> {
  const edgeLength = getEdgeLength(pageBounds, edge);
  const count = connections.length;

  // Calculate spacing (with padding from corners)
  const padding = Math.min(40, edgeLength * 0.15);
  const usableLength = edgeLength - padding * 2;
  const spacing = count > 1 ? usableLength / (count - 1) : 0;

  // Sort connections by their approach angle for natural ordering
  const sorted = [...connections].sort((a, b) => {
    const angleA = getApproachAngle(a, edge, isSource, boundsMap);
    const angleB = getApproachAngle(b, edge, isSource, boundsMap);

    // Sort based on edge orientation
    if (edge === 'top' || edge === 'bottom') {
      // Sort by x-component of approach angle (left to right)
      return Math.cos(angleA) - Math.cos(angleB);
    } else {
      // Sort by y-component of approach angle (top to bottom)
      return Math.sin(angleA) - Math.sin(angleB);
    }
  });

  const ports = new Map<string, Port>();

  sorted.forEach((conn, index) => {
    const offset = count > 1 ? padding + index * spacing : edgeLength / 2;
    const position = offset / edgeLength;
    const point = getPointOnEdge(pageBounds, edge, position);

    ports.set(conn.id, {
      pageId: pageBounds.pageId,
      edge,
      position,
      x: point.x,
      y: point.y,
    });
  });

  return ports;
}

/**
 * Allocate all source ports
 */
function allocateSourcePorts(
  connections: ConnectionWithEdges[],
  boundsMap: Map<string, PageBounds>
): Map<string, Port> {
  const allPorts = new Map<string, Port>();

  // Group by source page + source edge
  const groups = groupBy(
    connections,
    (c) => `${c.sourcePageId}:${c.sourceEdge}`
  );

  for (const [key, group] of groups) {
    const [pageId, edge] = key.split(':') as [string, Edge];
    const bounds = boundsMap.get(pageId);

    if (bounds) {
      const ports = allocatePortsOnEdge(group, edge, bounds, boundsMap, true);
      for (const [connId, port] of ports) {
        allPorts.set(connId, port);
      }
    }
  }

  return allPorts;
}

/**
 * Allocate all target ports
 */
function allocateTargetPorts(
  connections: ConnectionWithEdges[],
  boundsMap: Map<string, PageBounds>
): Map<string, Port> {
  const allPorts = new Map<string, Port>();

  // Group by target page + target edge
  const groups = groupBy(
    connections,
    (c) => `${c.targetPageId}:${c.targetEdge}`
  );

  for (const [key, group] of groups) {
    const [pageId, edge] = key.split(':') as [string, Edge];
    const bounds = boundsMap.get(pageId);

    if (bounds) {
      const ports = allocatePortsOnEdge(group, edge, bounds, boundsMap, false);
      for (const [connId, port] of ports) {
        allPorts.set(connId, port);
      }
    }
  }

  return allPorts;
}

// =============================================================================
// CORE ALGORITHM - PATH CALCULATION
// =============================================================================

/**
 * Calculate the bezier path string with obstacle awareness
 */
function calculateBezierPath(
  sourcePort: Port,
  targetPort: Port,
  obstacles: PageBounds[]
): string {
  const dx = targetPort.x - sourcePort.x;
  const dy = targetPort.y - sourcePort.y;
  const distance = Math.hypot(dx, dy);

  // Base curvature proportional to distance
  let baseCurvature = Math.min(distance * 0.35, 120);
  baseCurvature = Math.max(baseCurvature, 40);

  // Get the direction vectors for each edge
  const sourceDir = getEdgeDirection(sourcePort.edge);
  const targetDir = getEdgeDirection(targetPort.edge);

  // Find pages that would block the direct path
  const blocking = obstacles.filter((page) =>
    lineIntersectsRect(sourcePort, targetPort, page)
  );

  let cp1: Point;
  let cp2: Point;

  if (blocking.length > 0) {
    // Calculate avoidance direction based on blocking pages
    const avoidDirection = calculateAvoidanceDirection(
      sourcePort,
      targetPort,
      blocking
    );

    // Increase curvature to route around obstacles
    const maxBlockingSize = Math.max(
      ...blocking.map((b) =>
        Math.max(b.right - b.left, b.bottom - b.top)
      )
    );
    const avoidCurvature = Math.max(baseCurvature, maxBlockingSize * 0.6 + 50);

    // Offset control points perpendicular to the direct path
    cp1 = {
      x: sourcePort.x + sourceDir.x * avoidCurvature + avoidDirection.x * avoidCurvature * 0.5,
      y: sourcePort.y + sourceDir.y * avoidCurvature + avoidDirection.y * avoidCurvature * 0.5,
    };
    cp2 = {
      x: targetPort.x + targetDir.x * avoidCurvature + avoidDirection.x * avoidCurvature * 0.5,
      y: targetPort.y + targetDir.y * avoidCurvature + avoidDirection.y * avoidCurvature * 0.5,
    };
  } else {
    // No obstacles: standard smooth bezier extending from edges
    cp1 = {
      x: sourcePort.x + sourceDir.x * baseCurvature,
      y: sourcePort.y + sourceDir.y * baseCurvature,
    };
    cp2 = {
      x: targetPort.x + targetDir.x * baseCurvature,
      y: targetPort.y + targetDir.y * baseCurvature,
    };
  }

  return `M ${sourcePort.x} ${sourcePort.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${targetPort.x} ${targetPort.y}`;
}

/**
 * Calculate which direction to curve around obstacles
 */
function calculateAvoidanceDirection(
  source: Point,
  target: Point,
  obstacles: PageBounds[]
): Point {
  // Calculate the perpendicular direction to the source→target line
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const len = Math.hypot(dx, dy);

  if (len === 0) return { x: 0, y: -1 };

  // Perpendicular vectors (normalized)
  const perp1 = { x: -dy / len, y: dx / len };
  const perp2 = { x: dy / len, y: -dx / len };

  // Find the center of mass of obstacles
  const obstacleCenter = {
    x: obstacles.reduce((sum, o) => sum + o.center.x, 0) / obstacles.length,
    y: obstacles.reduce((sum, o) => sum + o.center.y, 0) / obstacles.length,
  };

  // Midpoint of source→target
  const midpoint = {
    x: (source.x + target.x) / 2,
    y: (source.y + target.y) / 2,
  };

  // Choose the perpendicular direction that points away from obstacles
  const toObstacles = {
    x: obstacleCenter.x - midpoint.x,
    y: obstacleCenter.y - midpoint.y,
  };

  // Dot product to determine which perpendicular is "away" from obstacles
  const dot1 = perp1.x * toObstacles.x + perp1.y * toObstacles.y;

  // Return the perpendicular that points away from obstacles
  return dot1 < 0 ? perp1 : perp2;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Main hook that calculates all routed connections
 */
function useRoutedConnections(
  pages: Page[],
  pagePositions: Record<string, { x: number; y: number }>,
  thumbWidth: number,
  thumbHeight: number
): RoutedConnection[] {
  return useMemo(() => {
    // 1. Build spatial data
    const boundsMap = new Map<string, PageBounds>();
    const allBounds: PageBounds[] = [];

    pages.forEach((page) => {
      const position = pagePositions[page.id];
      if (position) {
        const bounds = getPageBounds(page.id, position, thumbWidth, thumbHeight);
        boundsMap.set(page.id, bounds);
        allBounds.push(bounds);
      }
    });

    // 2. Find all connections
    const connections: Connection[] = [];
    pages.forEach((page) => {
      page.tree.forEach((node) => {
        findNavigationInteractions(node, page.id, connections);
      });
    });

    // Filter out connections where target page doesn't exist
    const pageIds = new Set(pages.map((p) => p.id));
    const validConnections = connections.filter((conn) =>
      pageIds.has(conn.targetPageId)
    );

    if (validConnections.length === 0) {
      return [];
    }

    // 3. Select optimal edges for each connection
    const connectionsWithEdges: ConnectionWithEdges[] = validConnections.map(
      (conn) => ({
        ...conn,
        ...selectOptimalEdges(conn, allBounds, boundsMap),
      })
    );

    // 4. Allocate ports (spread connections sharing same edge)
    const sourcePorts = allocateSourcePorts(connectionsWithEdges, boundsMap);
    const targetPorts = allocateTargetPorts(connectionsWithEdges, boundsMap);

    // 5. Calculate paths
    return connectionsWithEdges.map((conn) => {
      const sourcePort = sourcePorts.get(conn.id);
      const targetPort = targetPorts.get(conn.id);

      if (!sourcePort || !targetPort) {
        // Fallback - shouldn't happen
        return {
          ...conn,
          sourcePort: {
            pageId: conn.sourcePageId,
            edge: 'right' as Edge,
            position: 0.5,
            x: 0,
            y: 0,
          },
          targetPort: {
            pageId: conn.targetPageId,
            edge: 'left' as Edge,
            position: 0.5,
            x: 0,
            y: 0,
          },
          path: '',
        };
      }

      // Get obstacles (all pages except source and target)
      const obstacles = allBounds.filter(
        (b) => b.pageId !== conn.sourcePageId && b.pageId !== conn.targetPageId
      );

      const path = calculateBezierPath(sourcePort, targetPort, obstacles);

      return {
        ...conn,
        sourcePort,
        targetPort,
        path,
      };
    });
  }, [pages, pagePositions, thumbWidth, thumbHeight]);
}

// =============================================================================
// COMPONENT
// =============================================================================

export const PageConnectors: React.FC<PageConnectorsProps> = ({
  pages,
  pagePositions,
  thumbWidth,
  thumbHeight,
}) => {
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  
  // Get fully routed connections
  const routedConnections = useRoutedConnections(
    pages,
    pagePositions,
    thumbWidth,
    thumbHeight
  );

  // Calculate SVG bounds
  const bounds = useMemo(() => {
    let minX = 0,
      minY = 0,
      maxX = 1000,
      maxY = 1000;
    
    Object.values(pagePositions).forEach((pos) => {
      minX = Math.min(minX, pos.x - 200);
      minY = Math.min(minY, pos.y - 200);
      maxX = Math.max(maxX, pos.x + thumbWidth + 200);
      maxY = Math.max(maxY, pos.y + thumbHeight + 200);
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [pagePositions, thumbWidth, thumbHeight]);

  const handleConnectionClick = useCallback((connection: RoutedConnection) => {
    // TODO: Could emit an event to select the component/interaction
    console.log('Connection clicked:', connection);
  }, []);

  if (routedConnections.length === 0) {
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
        zIndex: 2, // Above page thumbnails (zIndex: 1)
      }}
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
    >
      {/* Arrow marker definitions */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M 0 0 L 5 3 L 0 6"
            fill="none"
            stroke="#6366f1"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
        <marker
          id="arrowhead-hover"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M 0 0 L 5 3 L 0 6"
            fill="none"
            stroke="#818cf8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      </defs>
      
      {routedConnections.map((connection) => {
        if (!connection.path) return null;

        const isHovered = hoveredConnection === connection.id;
        
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
            
            {/* Visible path */}
            <path
              d={connection.path}
              fill="none"
              stroke={isHovered ? '#818cf8' : '#6366f1'}
              strokeWidth={isHovered ? 3 : 2}
              strokeDasharray={isHovered ? 'none' : '8 4'}
              markerEnd={isHovered ? 'url(#arrowhead-hover)' : 'url(#arrowhead)'}
              style={{
                transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
                pointerEvents: 'none',
              }}
            />
            
            {/* Connection dot at source */}
            <circle
              cx={connection.sourcePort.x}
              cy={connection.sourcePort.y}
              r={isHovered ? 5 : 4}
              fill={isHovered ? '#818cf8' : '#6366f1'}
              style={{ transition: 'r 0.15s ease, fill 0.15s ease' }}
            />
          </g>
        );
      })}
    </svg>
  );
};
