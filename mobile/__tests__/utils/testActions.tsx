import { fireEvent, act } from '@testing-library/react-native';
import { TEST_IDS } from './testConstants';
import { BotType } from './testTypes';

export const simulateBuildProcess = async (
  utils: any,
  type: BotType,
  quantity: string,
  shouldQueue = false
) => {
  fireEvent.press(utils.getByTestId(TEST_IDS.BOT_CARD(type)));
  fireEvent.changeText(utils.getByTestId(TEST_IDS.QUANTITY_INPUT), quantity);
  fireEvent.press(utils.getByText(shouldQueue ? 'ADD TO QUEUE' : 'BUILD'));
};

export const simulateBuildProgress = (
  mockContext: any,
  progress: number,
  options?: { 
    startTime?: Date;
    quantity?: number;
    type?: BotType;
  }
) => {
  act(() => {
    mockContext.buildingProgress = progress;
    if (options?.startTime) mockContext.buildStartTime = options.startTime;
    if (options?.quantity) mockContext.totalBuildQuantity = options.quantity;
    if (options?.type) mockContext.selectedType = options.type;
  });
};

export const simulateQueueState = (
  mockContext: any,
  items: Array<{ type: BotType; quantity: number }>
) => {
  act(() => {
    mockContext.buildQueue = items;
  });
}; 