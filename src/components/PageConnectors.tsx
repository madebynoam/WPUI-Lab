'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { Page, ComponentNode, Interaction } from '@/types';

interface PageConnectorsProps {
  pages: Page[];
  pagePositions: Record<string, { x: number; y: number }>;
  thumbWidth: number;
  thumbHeight: number;
}

interface Connection {
  id: string;
  sourcePageId: string;
  targetPageId: string;
  sourceComponentId: string;
  interaction: Interaction;
}

// Find all navigation interactions in a tree
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

// Calculate connection points for bezier curve
function calculateConnectionPoints(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  thumbWidth: number,
  thumbHeight: number
): {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  controlX1: number;
  controlY1: number;
  controlX2: number;
  controlY2: number;
} {
  const sourceCenterX = sourcePos.x + thumbWidth / 2;
  const sourceCenterY = sourcePos.y + thumbHeight / 2;
  const targetCenterX = targetPos.x + thumbWidth / 2;
  const targetCenterY = targetPos.y + thumbHeight / 2;
  
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;
  
  let startX: number, startY: number, endX: number, endY: number;
  
  // Determine which edges to connect based on relative positions
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection
    if (dx > 0) {
      // Target is to the right
      startX = sourcePos.x + thumbWidth;
      startY = sourceCenterY;
      endX = targetPos.x;
      endY = targetCenterY;
    } else {
      // Target is to the left
      startX = sourcePos.x;
      startY = sourceCenterY;
      endX = targetPos.x + thumbWidth;
      endY = targetCenterY;
    }
  } else {
    // Vertical connection
    if (dy > 0) {
      // Target is below
      startX = sourceCenterX;
      startY = sourcePos.y + thumbHeight;
      endX = targetCenterX;
      endY = targetPos.y;
    } else {
      // Target is above
      startX = sourceCenterX;
      startY = sourcePos.y;
      endX = targetCenterX;
      endY = targetPos.y + thumbHeight;
    }
  }
  
  // Calculate control points for smooth bezier curve
  const distance = Math.sqrt(dx * dx + dy * dy);
  const curvature = Math.min(distance * 0.4, 100);
  
  const controlX1 = startX + (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? curvature : -curvature) : 0);
  const controlY1 = startY + (Math.abs(dx) <= Math.abs(dy) ? (dy > 0 ? curvature : -curvature) : 0);
  const controlX2 = endX - (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? curvature : -curvature) : 0);
  const controlY2 = endY - (Math.abs(dx) <= Math.abs(dy) ? (dy > 0 ? curvature : -curvature) : 0);
  
  return { startX, startY, endX, endY, controlX1, controlY1, controlX2, controlY2 };
}

export const PageConnectors: React.FC<PageConnectorsProps> = ({
  pages,
  pagePositions,
  thumbWidth,
  thumbHeight,
}) => {
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  
  // Find all connections between pages
  const connections = useMemo(() => {
    const allConnections: Connection[] = [];
    
    pages.forEach((page) => {
      page.tree.forEach((node) => {
        findNavigationInteractions(node, page.id, allConnections);
      });
    });
    
    // Filter out connections where target page doesn't exist
    const pageIds = new Set(pages.map(p => p.id));
    return allConnections.filter(conn => pageIds.has(conn.targetPageId));
  }, [pages]);

  // Calculate SVG bounds
  const bounds = useMemo(() => {
    let minX = 0, minY = 0, maxX = 1000, maxY = 1000;
    
    Object.values(pagePositions).forEach((pos) => {
      minX = Math.min(minX, pos.x - 100);
      minY = Math.min(minY, pos.y - 100);
      maxX = Math.max(maxX, pos.x + thumbWidth + 100);
      maxY = Math.max(maxY, pos.y + thumbHeight + 100);
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [pagePositions, thumbWidth, thumbHeight]);

  const handleConnectionClick = useCallback((connection: Connection) => {
    // TODO: Could emit an event to select the component/interaction
    console.log('Connection clicked:', connection);
  }, []);

  if (connections.length === 0) {
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
      }}
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
    >
      {/* Arrow marker definition */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#6366f1"
          />
        </marker>
        <marker
          id="arrowhead-hover"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#818cf8"
          />
        </marker>
      </defs>
      
      {connections.map((connection) => {
        const sourcePos = pagePositions[connection.sourcePageId];
        const targetPos = pagePositions[connection.targetPageId];
        
        if (!sourcePos || !targetPos) return null;
        
        const points = calculateConnectionPoints(sourcePos, targetPos, thumbWidth, thumbHeight);
        const isHovered = hoveredConnection === connection.id;
        
        const path = `M ${points.startX} ${points.startY} C ${points.controlX1} ${points.controlY1}, ${points.controlX2} ${points.controlY2}, ${points.endX} ${points.endY}`;
        
        return (
          <g key={connection.id}>
            {/* Invisible wider path for easier clicking */}
            <path
              d={path}
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
              d={path}
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
            
            {/* Connection dot at start */}
            <circle
              cx={points.startX}
              cy={points.startY}
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
