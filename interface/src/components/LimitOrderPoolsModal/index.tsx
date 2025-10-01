import React from 'react';
import Portal from 'components/Portal';
import { poolsV2WithLO } from 'utils/pools';
import { Token } from 'utils/types';
import './index.scss';

interface ModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

type LimitOrderPoolsModalProps = Omit<ModalProps, 'children'> & {
  onSelectPool: (token0: Token, token1: Token) => void;
};

const LimitOrderPoolsModal = ({
  showModal,
  setShowModal,
  onSelectPool,
}: LimitOrderPoolsModalProps) => {
  if (!showModal) return null;

  return (
    <Portal>
      <div className="modal-overlay" onClick={() => setShowModal(false)}>
        <div
          className="limit-order-pools-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>Pools Supporting Limit Orders</h2>
            <p className="modal-subtitle">
              Limit orders are currently available for the following pools.
              <br />
              <strong>Click on a pool to select it.</strong>
            </p>
          </div>

          <div className="pools-list">
            {poolsV2WithLO.map((pool, index) => {
              const token0 = pool.token0;
              const token1 = pool.token1;
              return (
                <div
                  key={index}
                  className="pool-item clickable"
                  onClick={() => onSelectPool(token0, token1)}
                >
                  <div className="pool-tokens">
                    <div className="token-info">
                      <img
                        src={
                          token0?.logoURI || '/assets/img/Massa_Brand_White.svg'
                        }
                        alt={token0?.symbol || 'Token'}
                        className="token-logo"
                      />
                      <span className="token-symbol">
                        {token0?.symbol || 'Token'}
                      </span>
                    </div>
                    <span className="separator">-</span>
                    <div className="token-info">
                      <img
                        src={
                          token1?.logoURI || '/assets/img/Massa_Brand_White.svg'
                        }
                        alt={token1?.symbol || 'Token'}
                        className="token-logo"
                      />
                      <span className="token-symbol">
                        {token1?.symbol || 'Token'}
                      </span>
                    </div>
                  </div>

                  <div className="pool-details">
                    <div className="detail-item">
                      <span className="detail-label">Bin Step:</span>
                      <span className="detail-value">{pool.binStep}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Version:</span>
                      <span className="detail-value">{pool.version}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="modal-footer">
            <p className="footer-note">
              To place limit orders, please select one of these token pairs.
            </p>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default LimitOrderPoolsModal;
