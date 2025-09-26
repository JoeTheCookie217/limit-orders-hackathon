import React, {
  useState,
  useContext,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { Fraction, parseUnits } from "@dusalabs/sdk";
import {
  faChevronDown,
  faExchangeAlt,
  faSearch,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "components/Button";
import Input from "components/Input";
import LimitOrderPoolsModal from "components/LimitOrderPoolsModal";
import Portal from "components/Portal";
import PriceInput from "components/PriceInput";
import { AccountWrapperContext } from "context/AccountWrapperContext";
import { SettingsContext } from "context/SettingsContext";
import { useAdvancedManageOrders } from "hooks/useAdvancedManageOrders";
import { useManageOrders } from "hooks/useManageOrders";
import { validateLimitOrderSupport } from "utils/methods";
import { MASSA, USDC, tokens, tags, tokenToTags } from "utils/tokens";
import type { Token } from "utils/types";
import "./index.scss";

const LimitOrderCard: React.FC = () => {
  const { connectedAddress, balances, refetch } = useContext(
    AccountWrapperContext
  );
  const { limitOrderSlippage } = useContext(SettingsContext);

  // Form state
  const [fromToken, setFromToken] = useState<Token>(MASSA);
  const [toToken, setToToken] = useState<Token>(USDC);
  const [inputAmount, setInputAmount] = useState("");

  // UI state
  const [showTokenSelector, setShowTokenSelector] = useState<
    "from" | "to" | null
  >(null);
  const [priceInputFocused, setPriceInputFocused] = useState(false);
  const [showLimitOrderPoolsModal, setShowLimitOrderPoolsModal] =
    useState(false);

  // Limit order validation state
  const [limitOrderError, setLimitOrderError] = useState<string | null>(null);

  // Token selector state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

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

  // Filter tokens based on search and tags
  const filteredTokens = useMemo(() => {
    return tokens.filter((token) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Tag filter
      const matchesTag =
        selectedTag === null ||
        (token.address &&
          tokenToTags[token.address] &&
          tokenToTags[token.address].includes(selectedTag as any));

      return matchesSearch && matchesTag;
    });
  }, [searchQuery, selectedTag]);

  // Calculate amounts and slippage for advanced hooks
  const allowedSlippage = new Fraction(BigInt(limitOrderSlippage), 10000n);
  const amountIn =
    inputAmount && fromToken ? parseUnits(inputAmount, fromToken.decimals) : 0n;

  // Advanced order management hooks
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
  } = useAdvancedManageOrders({
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

  // Order management hooks
  const { createLimitOrder, isCreatingOrder, orderError, clearError } =
    useManageOrders();

  // Use the advanced error or fallback to original error
  const finalLimitOrderError = advancedLimitOrderError || limitOrderError;

  // Swap from/to tokens
  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    // Keep inputAmount as is - the user's quantity input remains the same
    // Order type is now determined automatically by the hook based on token order
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

    const isValid =
      connectedAddress &&
      inputAmount &&
      isValidAmount &&
      !invalidAmountLimitOrder &&
      !advancedLimitOrderError &&
      (isValidAmount
        ? BigInt(Math.floor(parsedAmount * 10 ** fromToken.decimals)) <=
          fromBalance
        : false);

    console.log({
      connectedAddress,
      inputAmount,
      parse: isValidAmount,
      invalidAmountLimitOrder,
      advancedLimitOrderError,
      balanceCheck: isValidAmount
        ? BigInt(Math.floor(parsedAmount * 10 ** fromToken.decimals)) <=
          fromBalance
        : false,
      isValid,
    });

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
    console.log({});

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

  // Token selection handlers
  const handleTokenSelect = (token: Token) => {
    // Close modal immediately, like in Dusa implementation
    setShowTokenSelector(null);

    const otherToken = showTokenSelector === "from" ? toToken : fromToken;

    // If selecting the same token as the other input, swap the tokens
    if (token.equals(otherToken)) {
      // Invert tokens like in Dusa implementation
      setFromToken(toToken);
      setToToken(fromToken);
      // Keep inputAmount - no need to swap amounts
    } else {
      // Normal token selection
      if (showTokenSelector === "from") {
        setFromToken(token);
      } else if (showTokenSelector === "to") {
        setToToken(token);
      }
      // Clear form when changing tokens
      setInputAmount("");
    }

    // Reset search state
    setSearchQuery("");
    setSelectedTag(null);
  };

  const handleCloseTokenSelector = () => {
    setShowTokenSelector(null);
    setSearchQuery("");
    setSelectedTag(null);
  };

  // Handle pool selection from modal
  const handleSelectPool = (token0: Token, token1: Token) => {
    setFromToken(token0);
    setToToken(token1);
    // Clear form when changing tokens
    setInputAmount("");
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
                <div
                  className="token-selector"
                  onClick={() => setShowTokenSelector("from")}
                >
                  <img
                    src={fromToken.logoURI}
                    alt={fromToken.symbol}
                    className="token-logo"
                  />
                  <span>{fromToken.symbol}</span>
                  <FontAwesomeIcon icon={faChevronDown} />
                </div>
              }
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="swap-button-wrapper">
          <button className="swap-button" onClick={handleSwapTokens}>
            <FontAwesomeIcon icon={faExchangeAlt} />
          </button>
        </div>

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
              <div
                className="token-selector"
                onClick={() => setShowTokenSelector("to")}
              >
                <img
                  src={toToken.logoURI}
                  alt={toToken.symbol}
                  className="token-logo"
                />
                <span>{toToken.symbol}</span>
                <FontAwesomeIcon icon={faChevronDown} />
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

        {/* Order Details */}
        {isFormValid() && (
          <div className="order-details">
            <div className="order-details__row">
              <span>Order Type</span>
              <span
                className={`order-type order-type--${isSellOrder ? "sell" : "buy"}`}
              >
                {isSellOrder ? "SELL" : "BUY"}
              </span>
            </div>
            <div className="order-details__row">
              <span>Slippage Tolerance</span>
              <span>{(limitOrderSlippage / 100).toFixed(2)}%</span>
            </div>
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
          {isCreatingOrder
            ? "Creating Order..."
            : `Create ${isSellOrder ? "SELL" : "BUY"} Order`}
        </Button>
      </div>

      {/* Token Selector Modal */}
      {showTokenSelector && (
        <Portal>
          <div
            className="token-modal-overlay"
            onClick={handleCloseTokenSelector}
          >
            <div className="token-modal" onClick={(e) => e.stopPropagation()}>
              <div className="token-modal__header">
                <h3>Select a Token</h3>
                <button onClick={handleCloseTokenSelector}>
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>

              <div className="token-modal__search">
                <div className="search-input">
                  <FontAwesomeIcon icon={faSearch} />
                  <input
                    type="text"
                    placeholder="Search by name or symbol..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="token-modal__tags">
                <button
                  className={`tag-button ${selectedTag === null ? "active" : ""}`}
                  onClick={() => setSelectedTag(null)}
                >
                  All
                </button>
                {tags.map((tag) => (
                  <button
                    key={tag}
                    className={`tag-button ${selectedTag === tag ? "active" : ""}`}
                    onClick={() => setSelectedTag(tag)}
                  >
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </button>
                ))}
              </div>

              <div className="token-modal__list">
                {filteredTokens.length > 0 ? (
                  filteredTokens.map((token, index) => {
                    const balance = balances.get(token.address || "") || 0n;
                    const isSelected =
                      (showTokenSelector === "from" &&
                        token.equals(fromToken)) ||
                      (showTokenSelector === "to" && token.equals(toToken));

                    return (
                      <div
                        key={`${token.address || "unknown"}-${index}`}
                        className={`token-item ${isSelected ? "selected" : ""}`}
                        onClick={() => handleTokenSelect(token)}
                      >
                        <div className="token-item__logo">
                          <img
                            src={token.logoURI}
                            alt={token.symbol}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "/assets/img/Massa_Brand_White.svg";
                            }}
                          />
                        </div>
                        <div className="token-item__info">
                          <div className="token-item__symbol">
                            {token.symbol}
                          </div>
                          <div className="token-item__name">
                            {token.name}
                            {token.address && tokenToTags[token.address] && (
                              <div className="token-item__tags">
                                {tokenToTags[token.address].map((tag) => (
                                  <span
                                    key={tag}
                                    className={`token-tag token-tag--${tag}`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="token-item__balance">
                          {formatBalance(balance, token)}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="token-modal__no-results">
                    <p>No tokens found matching your criteria</p>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedTag(null);
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

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
