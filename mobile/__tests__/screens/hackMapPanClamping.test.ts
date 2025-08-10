import { computePanBounds, clampPan } from '@/utils/mapPanBounds';

describe('Step 6: Map pan clamping (no black void)', () => {
  it('clamps panning to dynamic bounds including red margins', () => {
    const CELL_SIZE = 55;
    const MARGIN_SIZE = 80;
    const gridSize = 50;
    const totalSize = gridSize * CELL_SIZE;
    const containerWidth = 360;
    const containerHeight = 640;

    const bounds = computePanBounds({
      totalSize,
      containerWidth,
      containerHeight,
      marginSize: MARGIN_SIZE,
    });

    expect(bounds.minX).toBe(-(totalSize + 2 * MARGIN_SIZE - containerWidth));
    expect(bounds.maxX).toBe(0);
    expect(bounds.minY).toBe(-(totalSize + 2 * MARGIN_SIZE - containerHeight));
    expect(bounds.maxY).toBe(0);

    const overshootNegative = { x: bounds.minX - 500, y: bounds.minY - 500 };
    const clampedNegative = clampPan(overshootNegative, bounds);
    expect(clampedNegative.x).toBe(bounds.minX);
    expect(clampedNegative.y).toBe(bounds.minY);

    const overshootPositive = { x: bounds.maxX + 500, y: bounds.maxY + 500 };
    const clampedPositive = clampPan(overshootPositive, bounds);
    expect(clampedPositive.x).toBe(bounds.maxX);
    expect(clampedPositive.y).toBe(bounds.maxY);
  });
});


