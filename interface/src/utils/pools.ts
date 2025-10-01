// Buildnet-only pools configuration
import { MASSA, WMAS, USDC, DUSA_MAIN } from './tokens';
import type { PoolV2WithLO, Pool } from './types';

// Buildnet V2 pools definition - simplified for buildnet only
const MasUsdc20V2: Pool = {
  // MAS - USDC V2 (buildnet)
  token0: MASSA,
  token1: USDC,
  binStep: 20,
  pairAddress: 'AS12cVxiDJCuVqvgxPhU9YKvtzSMnEokGniEwPdmK4NNyyucM927F', // Buildnet only
  version: 'V2',
};

const DusaMas15V2: Pool = {
  // DUSA - MAS V2 (buildnet)
  token0: DUSA_MAIN,
  token1: MASSA,
  binStep: 15,
  pairAddress: 'AS1QrDsMvKhGrPzVmK9xKGzqMhsD9HbPJKqVzQ7RHUvMyLBdpx5', // Buildnet only
  version: 'V2',
};

// Pools with limit order support - buildnet only
export const poolsV2WithLO: PoolV2WithLO[] = [
  {
    ...MasUsdc20V2,
    loSC: 'AS1Gfy1wx7DuPZhbH9N1W9H7q5Sdjn51zMNP6sDpCdozT6F715kP', // Buildnet LO contract
  },
  // More pools can be added here when limit order support is available on buildnet
].filter((pool) => pool.pairAddress !== '');

// Export individual pools for reference (buildnet only)
export { MasUsdc20V2, DusaMas15V2 };

export default poolsV2WithLO;
