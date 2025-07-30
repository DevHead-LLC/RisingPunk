import { useGetBattleStateQuery } from '../store/api/battleApi';
import { Dimensions } from 'react-native';

interface UseBattleStateOptions {
  battleId: string;
  pollingInterval?: number;
  skip?: boolean;
}

export const useBattleState = ({ 
  battleId, 
  pollingInterval = 1000,
  skip = false 
}: UseBattleStateOptions) => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  return useGetBattleStateQuery(
    { battleId, screenWidth, screenHeight },
    {
      pollingInterval,
      skip: !battleId || skip,
    }
  );
}; 