import React, {
  useState,
  useContext,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { Fraction, parseUnits } from "@dusalabs/sdk";
import { faExchangeAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "components/Button";
import Input from "components/Input";
import LimitOrderPoolsModal from "components/LimitOrderPoolsModal";
import PriceInput from "components/PriceInput";
import { AccountWrapperContext } from "context/AccountWrapperContext";
import { SettingsContext } from "context/SettingsContext";
import { useManageLimitOrders } from "hooks/useManageLimitOrders";
import { validateLimitOrderSupport } from "utils/methods";
import { MASSA, USDC } from "utils/tokens";
import type { Token } from "utils/types";
import "./index.scss";

const LimitOrderCard: React.FC = () => {
  const { connectedAddress, balances, refetch } = useContext(
    AccountWrapperContext
  );
  const { limitOrderSlippage } = useContext(SettingsContext);

  // Form state - tokens are now locked
  const fromToken = USDC;
  const toToken = MASSA;
  const [inputAmount, setInputAmount] = useState("");

  // UI state - token selector removed
  const [priceInputFocused, setPriceInputFocused] = useState(false);
  const [showLimitOrderPoolsModal, setShowLimitOrderPoolsModal] =
    useState(false);

  // Limit order validation state
  const [limitOrderError, setLimitOrderError] = useState<string | null>(null);

  // Token selector state removed

  // Get balances
  const fromBalance = balances.get(fromToken?.address || "") || 0n;
  const toBalance = balances.get(toToken?.address || "") || 0n;

  // Check if limit orders are supported for the selected tokens
  useEffect(() => {
    if (fromToken && toToken) {
      const validation = validateLimitOrderSupport(fromToken, toToken);
      setLimitOrderError(validation.error || null);
    } else {
      setLimitOrderError(null);
    }
  }, [fromToken, toToken]);

  // Format balance for display
  const formatBalance = useCallback((balance: bigint, token: Token) => {
    const formatted = (Number(balance) / 10 ** token.decimals).toFixed(4);
    return `${formatted} ${token.symbol}`;
  }, []);

  // Token filtering removed - no longer needed

  // Calculate amounts and slippage for advanced hooks
  const allowedSlippage = new Fraction(BigInt(limitOrderSlippage), 10000n);
  const amountIn =
    inputAmount && fromToken ? parseUnits(inputAmount, fromToken.decimals) : 0n;

  // Unified order management hook
  const {
    // Pool and validation info
    limitOrderPool,
    limitOrderError: advancedLimitOrderError,
    isLimitOrderSupported,

    // Order state
    orderType,
    isSellOrder,
    setIsSellOrder,
    isPriceInverted,
    setIsPriceInverted,

    // Price and ID management
    targetId,
    targetPrice,
    limitValueDiff,
    activeId,

    // Price handling
    priceLO,
    setPriceLO,
    priceLODisplayed,
    setPriceLODisplayed,
    handleKeyDownLimit,
    handleBlur,
    resetLimitValue,

    // Amount calculations
    orderAmountInDisplayed,
    orderAmountOutDisplayed,
    invalidAmountLimitOrder,

    // Allowance handling
    allowance,
    allowanceType,
    setAllowanceType,
    submitIncreaseAllowanceTx,
    pendingAllowance,

    // Date handling - not used in UI but kept for order creation
    date,
    expiryDate,

    // Order management
    createLimitOrder,
    isCreatingOrder,
    orderError,
    clearError,
  } = useManageLimitOrders({
    userAddress: connectedAddress || undefined,
    token0: fromToken,
    token1: toToken,
    resetTokensInputs: () => {
      setInputAmount("");
    },
    amountIn,
    quantityIn: inputAmount,
    allowedSlippage,
    fetchBalances: () => {
      refetch(["balances"]);
    },
  });

  // Use the advanced error or fallback to original error
  const finalLimitOrderError = advancedLimitOrderError || limitOrderError;

  // Swap function disabled - tokens are locked
  const handleSwapTokens = () => {
    // No-op: tokens are locked to MAS -> USDC
  };

  // Handle amount changes - let the hook handle calculations
  const handleInputAmountChange = (amount: string) => {
    setInputAmount(amount);
    // The orderAmountOutDisplayed will be automatically calculated by the hook
  };

  // Validate form using hook validation
  const isFormValid = () => {
    const parsedAmount = parseFloat(inputAmount);
    const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

    // Validate that we have a valid price and IDs
    const isPriceValid =
      activeId !== undefined &&
      targetId !== undefined &&
      (isSellOrder ? targetId < activeId : targetId > activeId);

    const isValid =
      connectedAddress &&
      inputAmount &&
      isValidAmount &&
      !invalidAmountLimitOrder &&
      !advancedLimitOrderError &&
      isPriceValid &&
      (isValidAmount
        ? BigInt(Math.floor(parsedAmount * 10 ** fromToken.decimals)) <=
          fromBalance
        : false);

    return isValid;
  };

  // Handle order creation
  const handleCreateOrder = async () => {
    if (!isFormValid()) return;

    // Clear previous errors
    clearError();

    const success = await createLimitOrder({
      fromToken,
      toToken,
      fromAmount: inputAmount,
      limitPrice: priceLODisplayed || "0",
      orderType: isSellOrder ? "sell" : "buy",
    });

    if (success) {
      // Clear form on successful order creation
      setInputAmount("");
      // Price will be reset via hook
    }
  };

  // Set max amount
  const handleMaxClick = () => {
    const maxAmount = Number(fromBalance) / 10 ** fromToken.decimals;
    setInputAmount(maxAmount.toString());
    handleInputAmountChange(maxAmount.toString());
  };

  // Token selection handlers - disabled since tokens are locked
  const handleTokenSelect = (token: Token) => {
    // No-op: token selection is disabled
  };

  const handleCloseTokenSelector = () => {
    // No-op: token selector is disabled
  };

  // Handle pool selection from modal - disabled
  const handleSelectPool = (token0: Token, token1: Token) => {
    // No-op: pool selection disabled, tokens are locked
    setShowLimitOrderPoolsModal(false);
  };

  if (!connectedAddress) {
    return (
      <div className="limit-order-card">
        <div className="limit-order-card__connect">
          <p>Connect your wallet to create limit orders</p>
        </div>
      </div>
    );
  }

  return (
    <div className="limit-order-card">
      <div className="limit-order-card__header">
        <h2>Create Limit Order</h2>
      </div>

      <div className="limit-order-card__form">
        {/* From Token Input */}
        <div className="token-input">
          <div className="token-input__header">
            <span className="token-input__label">From</span>
            <span className="token-input__balance" onClick={handleMaxClick}>
              Balance: {formatBalance(fromBalance, fromToken)}
            </span>
          </div>
          <div className="token-input__wrapper">
            <Input
              type="number"
              placeholder="0.0"
              value={inputAmount}
              onChange={(e) => handleInputAmountChange(e.target.value)}
              rightAddon={
                <div className="token-display">
                  <img
                    src={fromToken.logoURI}
                    alt={fromToken.symbol}
                    className="token-logo"
                  />
                  <span>{fromToken.symbol}</span>
                </div>
              }
            />
          </div>
        </div>

        {/* Swap Button - Disabled */}
        {/* <div className="swap-button-wrapper">
          <button className="swap-button" disabled>
            <FontAwesomeIcon icon={faExchangeAlt} />
          </button>
        </div> */}

        {/* To Token Input */}
        <div className="token-input">
          <div className="token-input__header">
            <span className="token-input__label">To (estimated)</span>
            <span className="token-input__balance">
              Balance: {formatBalance(toBalance, toToken)}
            </span>
          </div>
          <Input
            type="number"
            placeholder="0.0"
            value={orderAmountOutDisplayed || ""}
            readOnly
            rightAddon={
              <div className="token-display">
                <img
                  src={toToken.logoURI}
                  alt={toToken.symbol}
                  className="token-logo"
                />
                <span>{toToken.symbol}</span>
              </div>
            }
          />
        </div>

        {/* Advanced Limit Price Input */}
        <PriceInput
          price={priceLODisplayed || ""}
          onPriceChange={setPriceLODisplayed}
          onKeyDown={handleKeyDownLimit}
          onBlur={handleBlur}
          isLoading={!priceLO}
          isDisabled={!isLimitOrderSupported}
          limitValueDiff={limitValueDiff}
          isPriceInverted={isPriceInverted}
          onTogglePriceInverted={() => setIsPriceInverted(!isPriceInverted)}
          baseTokenSymbol={isPriceInverted ? toToken.symbol : fromToken.symbol}
          quoteTokenSymbol={isPriceInverted ? fromToken.symbol : toToken.symbol}
          onResetToMarket={resetLimitValue}
          rightAddon={isPriceInverted ? toToken.symbol : fromToken.symbol}
        />

        {/* Limit Order Error Warning */}
        {(finalLimitOrderError || orderError) && (
          <div className="error-info-container">
            <span className="error-info">
              - {finalLimitOrderError || orderError}{" "}
              <span
                className="error-info-link"
                onClick={() => setShowLimitOrderPoolsModal(true)}
              >
                View supported pools
              </span>
            </span>
          </div>
        )}

        {/* Allowance Status - Show when allowance is insufficient */}
        {fromToken?.symbol !== "MAS" &&
          inputAmount &&
          parseFloat(inputAmount) > 0 &&
          fromToken &&
          Number(fromBalance) / 10 ** fromToken.decimals >=
            parseFloat(inputAmount) &&
          amountIn > allowance && (
            <div
              className="order-details"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                borderColor: "var(--error-color)",
              }}
            >
              <div className="order-details__row">
                <span style={{ color: "var(--error-color)" }}>
                  Allowance Required
                </span>
                <span style={{ color: "var(--error-color)", fontSize: "12px" }}>
                  {(
                    (Number(amountIn) - Number(allowance)) /
                    10 ** fromToken.decimals
                  ).toFixed(6)}{" "}
                  {fromToken.symbol}
                </span>
              </div>
              <Button
                onClick={() => submitIncreaseAllowanceTx()}
                disabled={pendingAllowance}
                loading={pendingAllowance}
                size="sm"
                variant="outline"
                style={{
                  marginTop: "8px",
                  borderColor: "var(--error-color)",
                  color: "var(--error-color)",
                  width: "100%",
                }}
              >
                {pendingAllowance ? "Approving..." : "Approve Token"}
              </Button>
            </div>
          )}

        {/* Submit Button */}
        <Button
          onClick={handleCreateOrder}
          disabled={!isFormValid()}
          loading={isCreatingOrder}
          fullWidth
          size="lg"
        >
          {isCreatingOrder ? "Creating Order..." : "Create Order"}
        </Button>
      </div>

      {/* Token Selector Modal - Removed since tokens are locked */}

      {/* Limit Order Pools Modal */}
      <LimitOrderPoolsModal
        showModal={showLimitOrderPoolsModal}
        setShowModal={setShowLimitOrderPoolsModal}
        onSelectPool={handleSelectPool}
      />
    </div>
  );
};

export default LimitOrderCard;
