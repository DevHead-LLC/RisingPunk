import { NodeIndex } from '../services/NodeService';

export interface NetworkConnection {
  from: NodeIndex;
  to: NodeIndex;
}

export interface LineProperties {
  length: number;
  angle: number;
  left: number;
  top: number;
}

export const NETWORK_CONNECTIONS: NetworkConnection[] = [
  { from: 0, to: 3 }, { from: 0, to: 4 },
  { from: 1, to: 3 }, { from: 1, to: 4 }, { from: 1, to: 5 },
  { from: 2, to: 4 }, { from: 2, to: 5 },
  { from: 6, to: 3 }, { from: 6, to: 4 },
  { from: 7, to: 3 }, { from: 7, to: 4 }, { from: 7, to: 5 },
  { from: 8, to: 4 }, { from: 8, to: 5 },
];

export const calculateLineProperties = (fromPos: { x: number; y: number }, toPos: { x: number; y: number }): LineProperties => {
  const deltaX = toPos.x - fromPos.x;
  const deltaY = toPos.y - fromPos.y;
  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

  return {
    length,
    angle,
    left: fromPos.x,
    top: fromPos.y,
  };
}; 