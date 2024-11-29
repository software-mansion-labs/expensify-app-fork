import type { CardStatus } from './types';

function getCardState(stateId: number): CardStatus {
  switch (stateId) {
    case 0:
      return 'not found';
    case 1:
      return 'requireActivation';
    case 2:
      return 'activating';
    case 3:
      return 'activated';
    case 4:
      return 'suspended';
    case 5:
      return 'deactivated';
    default:
      throw new Error(`Unknown card state: ${stateId}`);
  }
}

export { getCardState };
