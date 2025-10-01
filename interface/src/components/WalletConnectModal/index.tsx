import React, { useContext } from 'react';
import {
  faTimes,
  faWallet,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { Wallet } from '@massalabs/wallet-provider';
import Button from 'components/Button';
import Portal from 'components/Portal';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import './index.scss';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (provider: Wallet) => Promise<void>;
  isConnecting: boolean;
}

const WalletConnectModal: React.FC<WalletConnectModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  isConnecting,
}) => {
  const { providerList, isLoading } = useContext(AccountWrapperContext);
  const availableProviders = providerList;
  const loadingProviders = isLoading;

  const getWalletIcon = (providerName: string) => {
    // You can add specific wallet icons here
    return faWallet;
  };

  const getWalletDescription = (providerName: string) => {
    switch (providerName.toLowerCase()) {
      case 'station':
        return 'Official Massa wallet extension';
      case 'bearby':
        return 'Multi-chain wallet for Massa';
      default:
        return 'Connect to access limit orders';
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="wallet-modal-overlay" onClick={onClose}>
        <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
          <div className="wallet-modal__header">
            <h2>Connect Wallet</h2>
            <button className="wallet-modal__close" onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div className="wallet-modal__content">
            <p className="wallet-modal__description">
              Connect your Massa wallet to start creating limit orders
            </p>

            {loadingProviders ? (
              <div className="wallet-modal__loading">
                <div className="spinner" />
                <p>Detecting wallets...</p>
              </div>
            ) : availableProviders.length > 0 ? (
              <div className="wallet-modal__providers">
                {availableProviders.map((provider, index) => (
                  <div
                    key={index}
                    className="wallet-provider"
                    onClick={isConnecting ? undefined : () => onConnect(provider)}
                  >
                    <div className="wallet-provider__icon">
                      <FontAwesomeIcon icon={getWalletIcon(provider.name())} />
                    </div>
                    <div className="wallet-provider__info">
                      <h3>{provider.name()}</h3>
                      <p>{getWalletDescription(provider.name())}</p>
                    </div>
                    {isConnecting && (
                      <div className="wallet-provider__connecting">
                        <div className="spinner" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="wallet-modal__no-wallets">
                <div className="wallet-modal__no-wallets-icon">
                  <FontAwesomeIcon icon={faWallet} />
                </div>
                <h3>No Massa Wallets Found</h3>
                <p>
                  Install a Massa wallet extension to connect and use limit
                  orders.
                </p>
                <div className="wallet-modal__install-links">
                  <a
                    href="https://station.massa.net/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="install-link"
                  >
                    Install Massa Station
                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="wallet-modal__footer">
            <p className="wallet-modal__help">
              Need help?{' '}
              <a
                href="https://docs.massa.net/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn about Massa wallets
              </a>
            </p>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default WalletConnectModal;
