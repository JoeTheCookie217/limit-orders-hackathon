import React, { useContext, useState } from "react";
import {
  faCog,
  faMoon,
  faSun,
  faWallet,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "components/Button";
import WalletConnectModal from "components/WalletConnectModal";
import { AccountWrapperContext } from "context/AccountWrapperContext";
import { SettingsContext } from "context/SettingsContext";
import { MASSA } from "utils/tokens";
import "./index.scss";

const Header: React.FC = () => {
  const {
    connectedAddress,
    isConnecting,
    connectWallet,
    disconnectWallet,
    balances,
  } = useContext(AccountWrapperContext);
  const { interfaceTheme, setInterfaceTheme } = useContext(SettingsContext);

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: bigint) => {
    const formatted = (Number(balance) / 10 ** MASSA.decimals).toFixed(4);
    return `${formatted} MAS`;
  };

  const toggleTheme = () => {
    const newTheme = interfaceTheme === "dark" ? "light" : "dark";
    setInterfaceTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const handleConnectClick = () => {
    setShowWalletModal(true);
  };

  const handleWalletConnect = async () => {
    await connectWallet();
    setShowWalletModal(false);
  };

  const masBalance = balances.get(MASSA.address) || 0n;

  return (
    <header className="header">
      <div className="header__container">
        <div className="header__left">
          <div className="header__logo">
            <h1>Limit Orders</h1>
            <span className="header__subtitle">based on Dusa pools</span>
          </div>
        </div>

        <div className="header__right">
          <button
            className="header__theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <FontAwesomeIcon
              icon={interfaceTheme === "dark" ? faSun : faMoon}
            />
          </button>

          {connectedAddress ? (
            <div className="header__wallet">
              <div
                className="header__account"
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              >
                <div className="header__account-info">
                  <div className="header__balance">
                    {formatBalance(masBalance)}
                  </div>
                  <div className="header__address">
                    {formatAddress(connectedAddress)}
                  </div>
                </div>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`header__dropdown-icon ${showAccountDropdown ? "header__dropdown-icon--open" : ""}`}
                />

                {showAccountDropdown && (
                  <div className="header__dropdown">
                    <button
                      className="header__dropdown-item"
                      onClick={disconnectWallet}
                    >
                      <FontAwesomeIcon icon={faWallet} />
                      Disconnect Wallet
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Button
              onClick={handleConnectClick}
              loading={isConnecting}
              size="sm"
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </div>

      <WalletConnectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={handleWalletConnect}
        isConnecting={isConnecting}
      />
    </header>
  );
};

export default Header;
