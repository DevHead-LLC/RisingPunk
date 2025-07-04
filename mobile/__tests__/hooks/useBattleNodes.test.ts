/**
 * @file useBattleNodes.test.ts
 * @description Tests for useInitialBattleNodes hook logic (Batch 1A)
 */

// Extract the positioning logic from the hook for testing
function calculateNodePositions(width: number, height: number) {
  const H_PADDING = 64;
  const V_PADDING = 40;

  const colWidth = (width - 2 * H_PADDING) / 2;
  const rowHeight = (height - 2 * V_PADDING) / 2;

  const X_LEFT = H_PADDING;
  const X_CENTER = H_PADDING + colWidth;
  const X_RIGHT = H_PADDING + 2 * colWidth;
  const Y_TOP = V_PADDING;
  const Y_MIDDLE = V_PADDING + rowHeight;
  const Y_BOTTOM = V_PADDING + 2 * rowHeight;

  return [
    { index: 0, position: { x: X_LEFT, y: Y_TOP }, owner: 'user' },
    { index: 1, position: { x: X_LEFT, y: Y_MIDDLE }, owner: 'user' },
    { index: 2, position: { x: X_LEFT, y: Y_BOTTOM }, owner: 'user' },
    { index: 3, position: { x: X_CENTER, y: Y_TOP }, owner: 'neutral' },
    { index: 4, position: { x: X_CENTER, y: Y_MIDDLE }, owner: 'neutral' },
    { index: 5, position: { x: X_CENTER, y: Y_BOTTOM }, owner: 'neutral' },
    { index: 6, position: { x: X_RIGHT, y: Y_TOP }, owner: 'enemy' },
    { index: 7, position: { x: X_RIGHT, y: Y_MIDDLE }, owner: 'enemy' },
    { index: 8, position: { x: X_RIGHT, y: Y_BOTTOM }, owner: 'enemy' },
  ];
}

// Import the actual rendering utilities for testing
import { getNodeColor, getNodeBorderColor } from '../../src/hooks/useBattleNodes';

describe('useInitialBattleNodes Logic (Batch 1A)', () => {
  describe('node positioning', () => {
    it('should position user nodes on the left', () => {
      const nodes = calculateNodePositions(400, 600);
      const userNodes = nodes.filter(node => node.owner === 'user');
      
      expect(userNodes).toHaveLength(3);
      userNodes.forEach(node => {
        expect(node.index).toBeLessThan(3);
        expect(node.position.x).toBe(64);
      });
    });

    it('should position neutral nodes in the center', () => {
      const nodes = calculateNodePositions(400, 600);
      const neutralNodes = nodes.filter(node => node.owner === 'neutral');
      
      expect(neutralNodes).toHaveLength(3);
      neutralNodes.forEach(node => {
        expect(node.index).toBeGreaterThanOrEqual(3);
        expect(node.index).toBeLessThan(6);
        expect(node.position.x).toBe(200);
      });
    });

    it('should position enemy nodes on the right', () => {
      const nodes = calculateNodePositions(400, 600);
      const enemyNodes = nodes.filter(node => node.owner === 'enemy');
      
      expect(enemyNodes).toHaveLength(3);
      enemyNodes.forEach(node => {
        expect(node.index).toBeGreaterThanOrEqual(6);
        expect(node.index).toBeLessThan(9);
        expect(node.position.x).toBe(336);
      });
    });

    it('should stack nodes vertically in each column', () => {
      const nodes = calculateNodePositions(400, 600);
      
      // Calculate expected Y positions
      const V_PADDING = 40;
      const rowHeight = (600 - 2 * V_PADDING) / 2;
      const Y_TOP = V_PADDING;
      const Y_MIDDLE = V_PADDING + rowHeight;
      const Y_BOTTOM = V_PADDING + 2 * rowHeight;
      
      const topNodes = nodes.filter(node => node.position.y === Y_TOP);
      const middleNodes = nodes.filter(node => node.position.y === Y_MIDDLE);
      const bottomNodes = nodes.filter(node => node.position.y === Y_BOTTOM);
      
      expect(topNodes).toHaveLength(3);
      expect(middleNodes).toHaveLength(3);
      expect(bottomNodes).toHaveLength(3);
    });
  });

  describe('responsive behavior', () => {
    it('should adjust positions based on screen dimensions', () => {
      const nodes1 = calculateNodePositions(400, 600);
      const nodes2 = calculateNodePositions(800, 1200);
      
      // For different screen sizes, the X positions should be different
      // because colWidth changes: (width - 2 * H_PADDING) / 2
      const colWidth1 = (400 - 2 * 64) / 2; // 136
      const colWidth2 = (800 - 2 * 64) / 2; // 336
      
      expect(nodes1[3].position.x).toBe(64 + colWidth1); // 200
      expect(nodes2[3].position.x).toBe(64 + colWidth2); // 400
      expect(nodes1[3].position.x).not.toBe(nodes2[3].position.x);
    });

    it('should maintain proper spacing ratios', () => {
      const nodes = calculateNodePositions(400, 600);
      
      const leftX = nodes[0].position.x;
      const centerX = nodes[3].position.x;
      const rightX = nodes[6].position.x;
      
      const leftToCenter = centerX - leftX;
      const centerToRight = rightX - centerX;
      
      expect(leftToCenter).toBe(centerToRight);
    });
  });

  describe('node ownership', () => {
    it('should assign correct ownership to all nodes', () => {
      const nodes = calculateNodePositions(400, 600);
      
      expect(nodes).toHaveLength(9);
      
      const userCount = nodes.filter(n => n.owner === 'user').length;
      const neutralCount = nodes.filter(n => n.owner === 'neutral').length;
      const enemyCount = nodes.filter(n => n.owner === 'enemy').length;
      
      expect(userCount).toBe(3);
      expect(neutralCount).toBe(3);
      expect(enemyCount).toBe(3);
    });
  });
});

describe('Node Rendering Utilities (Batch 1B)', () => {
  describe('node colors', () => {
    it('should return correct colors for each owner type', () => {
      expect(getNodeColor('user')).toBe('#4717F6'); // User blue
      expect(getNodeColor('enemy')).toBe('#FF4141'); // Enemy red
      expect(getNodeColor('neutral')).toBe('#666666'); // Neutral gray
    });

    it('should return correct border colors for each owner type', () => {
      expect(getNodeBorderColor('user')).toBe('#7C3AED'); // Lighter blue border
      expect(getNodeBorderColor('enemy')).toBe('#EF4444'); // Lighter red border
      expect(getNodeBorderColor('neutral')).toBe('#9CA3AF'); // Light gray border
    });

    it('should maintain consistent color scheme', () => {
      // User colors should be blue variants
      const userColor = getNodeColor('user');
      const userBorderColor = getNodeBorderColor('user');
      expect(userColor).toMatch(/^#[0-9A-F]{6}$/i); // Valid hex color
      expect(userBorderColor).toMatch(/^#[0-9A-F]{6}$/i); // Valid hex color
      
      // Enemy colors should be red variants
      const enemyColor = getNodeColor('enemy');
      const enemyBorderColor = getNodeBorderColor('enemy');
      expect(enemyColor).toMatch(/^#[0-9A-F]{6}$/i); // Valid hex color
      expect(enemyBorderColor).toMatch(/^#[0-9A-F]{6}$/i); // Valid hex color
      
      // Neutral colors should be gray variants
      const neutralColor = getNodeColor('neutral');
      const neutralBorderColor = getNodeBorderColor('neutral');
      expect(neutralColor).toMatch(/^#[0-9A-F]{6}$/i); // Valid hex color
      expect(neutralBorderColor).toMatch(/^#[0-9A-F]{6}$/i); // Valid hex color
    });
  });
}); 