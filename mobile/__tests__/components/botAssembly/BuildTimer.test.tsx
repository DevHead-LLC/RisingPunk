import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { BuildTimer } from '../../../src/components/botAssembly/BuildTimer';
import { BotsContext } from '../../../src/context/BotsContext';

const mockBotsContext = {
  botCounts: { breacher: 0, guardian: 0, phreak: 0 },
  buildingProgress: null,
  selectedType: null,
  startBuilding: jest.fn(),
  selectBotType: jest.fn(),
  buildStartTime: null,
  totalBuildQuantity: 0,
  setBuildingProgress: jest.fn(),
  setBotCounts: jest.fn()
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BotsContext.Provider value={mockBotsContext}>
    {children}
  </BotsContext.Provider>
);

const fetchMock = jest.fn()
  .mockImplementationOnce(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      buildQueue: {
        progress: 40,
        quantity: 5,
        botsBuilt: 2
      }
    })
  } as Response))
  .mockImplementationOnce(() => Promise.reject(new Error('Network error')))
  .mockImplementationOnce(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      buildQueue: {
        progress: 60,
        quantity: 5,
        botsBuilt: 3
      }
    })
  } as Response));

global.fetch = fetchMock;

describe('BuildTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    const mockBuildState = {
      buildQueue: {
        type: 'breacher',
        quantity: 5,
        botsBuilt: 2,
        startedAt: new Date(Date.now() - 2000),
        completesAt: new Date(Date.now() + 3000),
        progress: 40
      }
    };

    jest.spyOn(global, 'fetch').mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockBuildState)
      } as Response)
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const defaultProps = {
    quantity: 5,
    buildTimePerUnit: 1000,
    progress: 40,
  };

  const createWrapper = (contextOverrides = {}) => {
    const defaultContext = {
      botCounts: { breacher: 0, guardian: 0, phreak: 0 },
      buildingProgress: null,
      selectedType: null,
      startBuilding: jest.fn(),
      selectBotType: jest.fn(),
      buildStartTime: null,
      totalBuildQuantity: 0,
      setBuildingProgress: jest.fn(),
      setBotCounts: jest.fn()
    };

    const mockContext = { ...defaultContext, ...contextOverrides };
    
    return ({ children }: { children: React.ReactNode }) => (
      <BotsContext.Provider value={mockContext}>
        {children}
      </BotsContext.Provider>
    );
  };

  it('should display correct progress count', () => {
    const wrapper = createWrapper({
      buildingProgress: 40,
      totalBuildQuantity: 5
    });
    const { getByText } = render(<BuildTimer {...defaultProps} />, { wrapper });
    expect(getByText('2/5')).toBeTruthy();
  });

  it('should display time remaining', () => {
    const now = new Date();
    const wrapper = createWrapper({
      buildingProgress: 40,
      totalBuildQuantity: 5,
      buildStartTime: new Date(now.getTime() - 2000) // 2 seconds ago
    });
    
    jest.setSystemTime(now);
    
    const { getByText } = render(<BuildTimer {...defaultProps} />, { wrapper });
    expect(getByText('3s remaining')).toBeTruthy();
  });

  it('should handle zero quantity', () => {
    const { getByText } = render(
      <BuildTimer {...defaultProps} quantity={0} progress={0} />,
      { wrapper }
    );
    expect(getByText('0/0')).toBeTruthy();
  });

  it('should handle 100% progress', () => {
    const now = new Date();
    const wrapper = createWrapper({
      buildingProgress: 100,
      totalBuildQuantity: 5,
      buildStartTime: new Date(now.getTime() - 5000) // Build started 5 seconds ago
    });
    
    jest.setSystemTime(now);
    
    const { getByText } = render(
      <BuildTimer {...defaultProps} progress={100} />,
      { wrapper }
    );
    expect(getByText('5/5')).toBeTruthy();
    expect(getByText('0s remaining')).toBeTruthy();
  });

  it('should display server-reported progress', async () => {
    const mockBuildState = {
      buildQueue: {
        type: 'breacher',
        quantity: 5,
        botsBuilt: 2,
        startedAt: new Date(Date.now() - 2000),
        completesAt: new Date(Date.now() + 3000),
        progress: 40
      }
    };

    const { getByText } = render(<BuildTimer {...defaultProps} />);
    await waitFor(() => {
      expect(getByText('2/5')).toBeTruthy();
    });
  });

  it('should handle disconnection and reconnection', async () => {
    const { getByText } = render(<BuildTimer {...defaultProps} />);
    
    await waitFor(() => {
      expect(getByText('2/5')).toBeTruthy();
    });

    // Force next polling interval
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(getByText('3/5')).toBeTruthy();
    });
  });
}); 