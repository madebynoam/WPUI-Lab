/**
 * PageFrame Tests
 *
 * Tests for the PageFrame component which renders individual pages
 * in the multi-page canvas view.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { PageFrame } from './PageFrame';
import { Page } from '@/types';

// =============================================================================
// MOCKS
// =============================================================================

// Mock setSelectedNodeIds for testing selection clearing behavior
const mockSetSelectedNodeIds = jest.fn();

// Mock useComponentTree hook
jest.mock('@/contexts/ComponentTreeContext', () => ({
  useComponentTree: jest.fn(() => ({
    projects: [
      {
        id: 'proj-1',
        name: 'Test Project',
        theme: { primaryColor: '#3858e9', backgroundColor: '#ffffff' },
      },
    ],
    currentProjectId: 'proj-1',
    setSelectedNodeIds: mockSetSelectedNodeIds,
  })),
}));

// Mock SelectionProvider
jest.mock('@/contexts/SelectionContext', () => ({
  SelectionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock SimpleDragProvider
jest.mock('@/contexts/SimpleDragContext', () => ({
  SimpleDragProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock WordPress theme
jest.mock('@wordpress/theme', () => ({
  privateApis: {},
}));

// Mock wordpressPrivateApis unlock
jest.mock('@/utils/wordpressPrivateApis', () => ({
  unlock: jest.fn(() => ({
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  })),
}));

// Mock RenderNode
jest.mock('./RenderNode', () => ({
  RenderNode: () => <div data-testid="render-node-mock" />,
}));

// =============================================================================
// TEST FIXTURES
// =============================================================================

const mockPage: Page = {
  id: 'page-1',
  name: 'Test Page',
  tree: [{ id: 'node-1', type: 'Button', props: {}, children: [] }],
};

const defaultProps = {
  page: mockPage,
  isSelected: false,
  isDrilledIn: false,
  position: { x: 100, y: 100 },
  presetWidth: 1280,
  presetHeight: 800,
  zoom: 1,
  isDragging: false,
  dragOffset: { x: 0, y: 0 },
  onPointerDown: jest.fn(),
  onSelect: jest.fn(),
  onDrillIn: jest.fn(),
};

// Helper to render PageFrame with default props
function renderPageFrame(props = {}) {
  return render(<PageFrame {...defaultProps} {...props} />);
}

// Helper to get the page frame container
function getPageFrame() {
  return document.querySelector('.page-frame');
}

// =============================================================================
// TESTS
// =============================================================================

describe('PageFrame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetSelectedNodeIds.mockClear();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('rendering', () => {
    it('renders without crashing', () => {
      renderPageFrame();
      expect(getPageFrame()).toBeInTheDocument();
    });

    it('displays page name in label', () => {
      const { getByText } = renderPageFrame();
      expect(getByText(/Test Page/)).toBeInTheDocument();
    });

    it('renders page content via RenderNode', () => {
      const { getByTestId } = renderPageFrame();
      expect(getByTestId('render-node-mock')).toBeInTheDocument();
    });

    it('shows empty page placeholder when tree is empty', () => {
      const emptyPage: Page = { id: 'page-2', name: 'Empty', tree: [] };
      const { getByText } = renderPageFrame({ page: emptyPage });
      expect(getByText('Empty page')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Page Drag Behavior Tests (Bug Fix Verification)
  // ===========================================================================

  describe('page drag behavior', () => {
    /**
     * BUG FIX TEST: Verify page drag is disabled when drilled in
     *
     * Root cause: PageFrame's onPointerDown always initiated page drag,
     * even when drilled in. This caused the whole page to move when
     * trying to drag components inside.
     *
     * Fix: Only attach onPointerDown handler when NOT drilled in.
     * When drilled in, component-level interactions take precedence.
     */
    it('should NOT trigger page drag when drilled in', () => {
      const onPointerDown = jest.fn();
      renderPageFrame({ isDrilledIn: true, onPointerDown });

      const pageFrame = getPageFrame() as HTMLElement;
      fireEvent.pointerDown(pageFrame, { button: 0, pointerId: 1 });

      // When drilled in, onPointerDown should NOT be called
      expect(onPointerDown).not.toHaveBeenCalled();
    });

    it('should trigger page drag when NOT drilled in', () => {
      const onPointerDown = jest.fn();
      renderPageFrame({ isDrilledIn: false, onPointerDown });

      const pageFrame = getPageFrame() as HTMLElement;
      fireEvent.pointerDown(pageFrame, { button: 0, pointerId: 1 });

      // When NOT drilled in, onPointerDown should be called
      expect(onPointerDown).toHaveBeenCalledWith(
        expect.any(Object),
        'page-1'
      );
    });

    it('should allow component interactions when drilled in', () => {
      renderPageFrame({ isDrilledIn: true });

      // The content wrapper should have pointerEvents: 'auto' when drilled in
      const contentWrapper = document.querySelector('[style*="pointer-events: auto"]');
      expect(contentWrapper).toBeInTheDocument();
    });

    it('should block component interactions when NOT drilled in', () => {
      renderPageFrame({ isDrilledIn: false });

      // The content wrapper should have pointerEvents: 'none' when not drilled in
      const contentWrapper = document.querySelector('[style*="pointer-events: none"]');
      expect(contentWrapper).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Selection and Drill-in Tests
  // ===========================================================================

  describe('selection and drill-in', () => {
    it('calls onSelect on single click', () => {
      const onSelect = jest.fn();
      renderPageFrame({ onSelect });

      const pageFrame = getPageFrame() as HTMLElement;
      fireEvent.click(pageFrame);

      expect(onSelect).toHaveBeenCalledWith('page-1');
    });

    it('calls onDrillIn on double-click', () => {
      const onDrillIn = jest.fn();
      renderPageFrame({ onDrillIn });

      const pageFrame = getPageFrame() as HTMLElement;
      fireEvent.doubleClick(pageFrame);

      expect(onDrillIn).toHaveBeenCalledWith('page-1');
    });

    it('calls onDrillIn on Cmd+click', () => {
      const onDrillIn = jest.fn();
      renderPageFrame({ onDrillIn });

      const pageFrame = getPageFrame() as HTMLElement;
      fireEvent.click(pageFrame, { metaKey: true });

      expect(onDrillIn).toHaveBeenCalledWith('page-1');
    });

    it('calls onDrillIn on Ctrl+click', () => {
      const onDrillIn = jest.fn();
      renderPageFrame({ onDrillIn });

      const pageFrame = getPageFrame() as HTMLElement;
      fireEvent.click(pageFrame, { ctrlKey: true });

      expect(onDrillIn).toHaveBeenCalledWith('page-1');
    });

    /**
     * BUG FIX TEST: Verify single-click clears item selections
     *
     * Root cause: When an item was selected inside a drilled-in page,
     * clicking the page label didn't deselect the item.
     *
     * Fix: Call setSelectedNodeIds([]) on single-click to select page,
     * but NOT on double-click to drill in.
     */
    it('clears item selections on single-click (select page)', () => {
      renderPageFrame();

      const pageFrame = getPageFrame() as HTMLElement;
      fireEvent.click(pageFrame);

      // Single-click to select page should clear item selections
      expect(mockSetSelectedNodeIds).toHaveBeenCalledWith([]);
    });

    it('does NOT clear item selections on double-click (drill in)', () => {
      renderPageFrame();

      const pageFrame = getPageFrame() as HTMLElement;
      fireEvent.doubleClick(pageFrame);

      // Double-click to drill in should NOT clear selections
      expect(mockSetSelectedNodeIds).not.toHaveBeenCalled();
    });

    it('does NOT clear item selections on Cmd+click (drill in)', () => {
      renderPageFrame();

      const pageFrame = getPageFrame() as HTMLElement;
      fireEvent.click(pageFrame, { metaKey: true });

      // Cmd+click to drill in should NOT clear selections
      expect(mockSetSelectedNodeIds).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Visual State Tests
  // ===========================================================================

  describe('visual states', () => {
    it('has higher z-index when selected', () => {
      renderPageFrame({ isSelected: true });

      const pageFrame = getPageFrame() as HTMLElement;
      expect(pageFrame.style.zIndex).toBe('10');
    });

    it('has highest z-index when dragging', () => {
      renderPageFrame({ isDragging: true });

      const pageFrame = getPageFrame() as HTMLElement;
      expect(pageFrame.style.zIndex).toBe('1000');
    });

    it('applies drag offset when dragging', () => {
      renderPageFrame({
        isDragging: true,
        position: { x: 100, y: 100 },
        dragOffset: { x: 50, y: 30 },
      });

      const pageFrame = getPageFrame() as HTMLElement;
      expect(pageFrame.style.left).toBe('150px');
      expect(pageFrame.style.top).toBe('130px');
    });
  });
});
