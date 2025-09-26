import React, { useContext, useEffect } from "react";
import {
  faTrash,
  faSpinner,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { formatDistanceToNow } from "date-fns";
import Button from "components/Button";
import { AccountWrapperContext } from "context/AccountWrapperContext";
import { useOrderAction } from "hooks/useOrderAction";
import type { EnrichedOrder } from "utils/datastoreFetcher";
import { getMasIfWmas } from "utils/methods";
import type { PendingLimitOrder } from "utils/storage";
import "./index.scss";
import { get } from "http";

interface ActiveOrdersListProps {
  orders: EnrichedOrder[] | undefined;
  ordersLoading?: PendingLimitOrder[];
  ordersRemoving?: PendingLimitOrder[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const ActiveOrdersList: React.FC<ActiveOrdersListProps> = ({
  orders,
  ordersLoading = [],
  ordersRemoving = [],
  isLoading,
  refetch,
}) => {
  const { connectedAddress } = useContext(AccountWrapperContext);

  const {
    cancelOrder: handleCancelOrder,
    claimOrder: handleClaimOrder,
    isProcessing,
    actionInProgress,
    actionError,
  } = useOrderAction();

  // Auto-refresh orders when there are pending orders
  useEffect(() => {
    if (ordersLoading.length > 0 || ordersRemoving.length > 0) {
      const interval = setInterval(() => refetch(), 4000);
      return () => clearInterval(interval);
    }
  }, [ordersLoading.length, ordersRemoving.length, refetch]);

  const formatPrice = (price: number) => {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  const formatAmount = (amount: bigint, decimals: number) => {
    const formatted = Number(amount) / 10 ** decimals;
    return formatted.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  };

  const getOrderTypeColor = (isSellOrder: boolean) => {
    return isSellOrder ? "sell" : "buy";
  };

  // Convert EnrichedOrder to the Order type expected by useOrderAction
  const convertToLocalOrder = (order: EnrichedOrder) => ({
    ...order,
    id: order.id.toString(),
    timestamp: order.timestamp.toISOString(),
    amountIn: BigInt(order.amountIn),
    status: order.status as
      | "ACTIVE"
      | "EXECUTED"
      | "CANCELLED"
      | "EXPIRED"
      | "CLAIMED",
  });

  if (!connectedAddress) {
    return (
      <div className="active-orders-list">
        <div className="active-orders-list__empty">
          <p>Connect wallet to view your orders</p>
        </div>
      </div>
    );
  }

  if (isLoading && !orders) {
    return (
      <div className="active-orders-list">
        <div className="active-orders-list__loading">
          <FontAwesomeIcon icon={faSpinner} spin />
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  const activeOrders =
    orders?.filter((order) => order.status === "ACTIVE") || [];

  return (
    <div className="active-orders-list">
      <div className="active-orders-list__header">
        <h3>Active Orders ({activeOrders.length + ordersLoading.length})</h3>
      </div>

      {/* Show pending orders first */}
      {ordersLoading.length > 0 && (
        <div className="active-orders-list__pending">
          {ordersLoading
            .sort((a, b) => b.id - a.id)
            .map((order) => (
              <div
                key={`loading-${order.id}`}
                className="order-item order-item--pending"
              >
                <div className="order-item__header">
                  <div className="order-item__pair">
                    <div className="pending-indicator">
                      <FontAwesomeIcon icon={faSpinner} spin />
                      <span>Creating order #{order.id}...</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {activeOrders.length === 0 && ordersLoading.length === 0 ? (
        <div className="active-orders-list__empty">
          <p>No active orders</p>
          <small>Create your first limit order to get started</small>
        </div>
      ) : activeOrders.length > 0 ? (
        <div className="active-orders-list__content">
          {activeOrders.map((order) => {
            const orderType = getOrderTypeColor(order.isSellOrder);
            const t0 = getMasIfWmas(order.tokenIn!);
            const t1 = getMasIfWmas(order.tokenOut!);

            return (
              <div key={order.id} className="order-item">
                <div className="order-item__header">
                  <div className="order-item__pair">
                    <div className="token-pair">
                      <img
                        src={t0?.logoURI || "/assets/img/Massa_Brand_White.svg"}
                        alt={t0?.symbol || "Token"}
                        className="token-logo"
                      />
                      <img
                        src={t1?.logoURI || "/assets/img/Massa_Brand_White.svg"}
                        alt={t1?.symbol || "Token"}
                        className="token-logo token-logo--secondary"
                      />
                    </div>
                    <div className="pair-info">
                      <span className="pair-name">
                        {t0?.symbol || "Token"}/{t1?.symbol || "Token"}
                      </span>
                      <span className={`order-type order-type--${orderType}`}>
                        {orderType.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="order-item__actions">
                    <button
                      className="action-btn action-btn--cancel"
                      onClick={() =>
                        handleCancelOrder(convertToLocalOrder(order))
                      }
                      disabled={isProcessing}
                      title="Cancel Order"
                    >
                      {isProcessing && actionInProgress === "cancel" ? (
                        <FontAwesomeIcon icon={faSpinner} spin />
                      ) : (
                        <FontAwesomeIcon icon={faTrash} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="order-item__details">
                  <div className="detail-row">
                    <span className="detail-label">Amount</span>
                    <span className="detail-value">
                      {formatAmount(BigInt(order.amountIn), t0?.decimals || 18)}{" "}
                      {t0?.symbol || "Token"}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Limit Price</span>
                    <span className="detail-value">
                      {formatPrice(order.price)} {t0?.symbol || "Token"}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">To Receive</span>
                    <span className="detail-value">
                      ~{formatAmount(order.amountOut, t1?.decimals || 18)}{" "}
                      {t1?.symbol || "Token"}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Created</span>
                    <span className="detail-value">
                      {formatDistanceToNow(new Date(order.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>

                <div className="order-item__footer">
                  <span className="order-id">Order #{order.id}</span>
                  <a
                    href={`https://massexplo.massahub.network/tx/${order.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link"
                  >
                    View on Explorer
                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default ActiveOrdersList;
