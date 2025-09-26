import React, { useState, useEffect } from 'react';
import {
  SettingsContext,
  type SettingsContextType,
  type InterfaceLevel,
} from 'context/SettingsContext';
import { actualTheme } from "utils/config";
import {
  getInterfaceLevel,
  setInterfaceLevel as setInterfaceLevelStorage,
  getInterfaceTheme,
  setInterfaceTheme as setInterfaceThemeStorage,
  getLimitOrderSlippage,
  setLimitOrderSlippage as setLimitOrderSlippageStorage,
  getAutoRefresh,
  setAutoRefresh as setAutoRefreshStorage,
  getIsOverlay,
  setIsOverlay as setIsOverlayStorage,
} from "utils/storage";

interface SettingsProviderProps {
  children: React.ReactNode;
}

const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [interfaceLevel, _setInterfaceLevel] =
    useState<InterfaceLevel>(getInterfaceLevel());
  const [interfaceTheme, _setInterfaceTheme] = useState<string>(
    getInterfaceTheme() ?? actualTheme,
  );
  const [limitOrderSlippage, _setLimitOrderSlippage] = useState<number>(
    getLimitOrderSlippage(),
  );
  const [autoRefresh, _setAutoRefresh] = useState<boolean>(getAutoRefresh());
  const [isOverlay, _setIsOverlay] = useState<boolean>(getIsOverlay());

  const setInterfaceLevel = (level: InterfaceLevel) => {
    _setInterfaceLevel(level);
    setInterfaceLevelStorage(level);
  };

  const setInterfaceTheme = (theme: string) => {
    _setInterfaceTheme(theme);
    setInterfaceThemeStorage(theme);
    document.documentElement.setAttribute('data-theme', theme);
  };

  const setLimitOrderSlippage = (slippage: number) => {
    _setLimitOrderSlippage(slippage);
    setLimitOrderSlippageStorage(slippage);
  };

  const setAutoRefresh = (enabled: boolean) => {
    _setAutoRefresh(enabled);
    setAutoRefreshStorage(enabled);
  };

  const setIsOverlay = (enabled: boolean) => {
    _setIsOverlay(enabled);
    setIsOverlayStorage(enabled);
  };

  const settings: SettingsContextType = {
    interfaceLevel,
    setInterfaceLevel,
    interfaceTheme,
    setInterfaceTheme,
    limitOrderSlippage,
    setLimitOrderSlippage,
    autoRefresh,
    setAutoRefresh,
    isOverlay,
    setIsOverlay,
  };

  // Set initial theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', interfaceTheme);
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsProvider;
