import {
  ChainId,
  LB_FACTORY_ADDRESS,
  LB_QUOTER_ADDRESS,
  LB_ROUTER_ADDRESS,
  V2_LB_FACTORY_ADDRESS,
  V2_LB_QUOTER_ADDRESS,
  V2_LB_ROUTER_ADDRESS
} from '@dusalabs/sdk';
import { CHAIN_ID as MASSA_CHAIN_ID_ENUM } from '@massalabs/massa-web3';

const getEnvVar = (key: string, defaultValue?: string) => {
  const val = import.meta.env[key];
  if (val === undefined && !defaultValue)
    throw new Error(`Missing env variable: ${key}`);
  return val ?? defaultValue;
};

const getEnvVarBool = (key: string, defaultValue?: boolean) =>
  getEnvVar(key, defaultValue ? 'true' : 'false') === 'true';

// API Configuration
export const api = getEnvVar('VITE_API');
export const baseApi = api.replace('/trpc', '');

// Network Configuration
export const NETWORK = getEnvVar('VITE_NETWORK_NAME');
export const CHAIN_ID = getEnvVar('VITE_CHAIN_ID') as any as ChainId;
export const CHAIN_URL = getEnvVar('VITE_CHAIN_URL');
export const GRPC_URL = getEnvVar('VITE_GRPC_URL', '_');
export const IS_BUILDNET = Number(CHAIN_ID) === ChainId.BUILDNET;
export const MASSA_CHAIN_ID = IS_BUILDNET
  ? MASSA_CHAIN_ID_ENUM.Buildnet
  : MASSA_CHAIN_ID_ENUM.Mainnet;

// Smart Contract Addresses
export const routerSC = LB_ROUTER_ADDRESS[CHAIN_ID] || '';
export const routerV2SC = V2_LB_ROUTER_ADDRESS[CHAIN_ID] || '';
export const factorySC = LB_FACTORY_ADDRESS[CHAIN_ID] || '';
export const factoryV2SC = V2_LB_FACTORY_ADDRESS[CHAIN_ID] || '';
export const quoterSC = LB_QUOTER_ADDRESS[CHAIN_ID] || '';
export const quoterV2SC = V2_LB_QUOTER_ADDRESS[CHAIN_ID] || '';

// Token SC address for DUSA token
export const tokenSC = 'AS12HT1JQUne9nkHevS9Q7HcsoAaYLXWPNgoWPuruV7Gw6Mb92ACL';

// Feature Flags
export const FEATURE_FLAGS = {
  LIMIT_ORDERS: getEnvVarBool('VITE_ENABLE_LIMIT_ORDERS', true),
  DARK_MODE: getEnvVarBool('VITE_ENABLE_DARK_MODE', true),
  AUTO_REFRESH: getEnvVarBool('VITE_ENABLE_AUTO_REFRESH', true),
  POINTS_V2: getEnvVarBool('VITE_ENABLE_POINTS_V2', false)
};

// Theme
export const actualTheme = 'dark'; // Default theme
