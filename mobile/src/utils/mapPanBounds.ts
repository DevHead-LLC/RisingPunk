export type PanBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export function computePanBounds(params: {
  totalSize: number;
  containerWidth: number;
  containerHeight: number;
  marginSize: number;
}): PanBounds {
  const { totalSize, containerWidth, containerHeight, marginSize } = params;
  if (!(totalSize > 0) || !(containerWidth > 0) || !(containerHeight > 0) || !(marginSize >= 0)) {
    throw new Error('Invalid dimensions for computePanBounds');
  }
  const minX = -(totalSize + 2 * marginSize - containerWidth);
  const maxX = 0;
  const minY = -(totalSize + 2 * marginSize - containerHeight);
  const maxY = 0;
  return { minX, maxX, minY, maxY };
}

export function clampPan(pan: { x: number; y: number }, bounds: PanBounds) {
  const x = Math.min(bounds.maxX, Math.max(bounds.minX, pan.x));
  const y = Math.min(bounds.maxY, Math.max(bounds.minY, pan.y));
  return { x, y };
}
