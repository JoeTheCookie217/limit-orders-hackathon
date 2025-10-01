import React, { useContext, useState } from "react";
import ActiveOrdersList from "components/ActiveOrdersList";
import Button from "components/Button";
import LimitOrderCard from "components/LimitOrderCard";
import WalletConnectModal from "components/WalletConnectModal";
import { AccountWrapperContext } from "context/AccountWrapperContext";
import { useFetchOrders } from "hooks/useFetchOrders";
import "./index.scss";

const LimitOrdersPage: React.FC = () => {
  const { connectedAddress, connectWallet, isConnecting } = useContext(
    AccountWrapperContext,
  );
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Real orders data using hooks
  const { orders, isLoading, ordersLoading, ordersRemoving, refetch } =
    useFetchOrders();

  const handleConnectClick = () => {
    setShowWalletModal(true);
  };

  const handleWalletConnect = async (provider: any) => {
    await connectWallet(provider);
    setShowWalletModal(false);
  };

  if (!connectedAddress) {
    return (
      <div className="limit-orders-page">
        <div className="limit-orders-page__connect">
          <div className="limit-orders-page__connect-content">
            <h2>Connect Your Wallet</h2>
            <p>Connect your Massa wallet to start creating limit orders</p>
            <Button onClick={handleConnectClick} loading={isConnecting} size="lg">
              Connect Wallet
            </Button>
          </div>
        </div>
        <WalletConnectModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          onConnect={handleWalletConnect}
          isConnecting={isConnecting}
        />
      </div>
    );
  }

  return (
    <div className="limit-orders-page">
      <div className="limit-orders-page__content">
        <div className="limit-orders-page__header">
          <h1>Limit Orders</h1>
          <p>Create and manage your limit orders (connected to Dusa pools)</p>
        </div>

        <div className="limit-orders-page__main">
          <div className="limit-orders-page__create">
            <LimitOrderCard />
          </div>

          <div className="limit-orders-page__orders">
            <ActiveOrdersList
              orders={orders}
              ordersLoading={ordersLoading}
              ordersRemoving={ordersRemoving}
              isLoading={isLoading}
              refetch={refetch}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LimitOrdersPage;
