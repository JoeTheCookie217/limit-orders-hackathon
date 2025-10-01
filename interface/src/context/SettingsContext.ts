import { createContext } from 'react';

export type InterfaceLevel = 'simple' | 'advanced';

export interface SettingsContextType {
  // Theme
  interfaceTheme: string;
  setInterfaceTheme: (theme: string) => void;

  // Interface Level
  interfaceLevel: InterfaceLevel;
  setInterfaceLevel: (level: InterfaceLevel) => void;

  // Slippage Settings
  limitOrderSlippage: number;
  setLimitOrderSlippage: (slippage: number) => void;

  // Auto refresh
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;

  // Overlay effects
  isOverlay: boolean;
  setIsOverlay: (enabled: boolean) => void;
}

export const SettingsContext = createContext<SettingsContextType>({
  interfaceTheme: 'dark',
  setInterfaceTheme: () => {},
  interfaceLevel: 'simple',
  setInterfaceLevel: () => {},
  limitOrderSlippage: 100, // 1%
  setLimitOrderSlippage: () => {},
  autoRefresh: true,
  setAutoRefresh: () => {},
  isOverlay: false,
  setIsOverlay: () => {},
});
