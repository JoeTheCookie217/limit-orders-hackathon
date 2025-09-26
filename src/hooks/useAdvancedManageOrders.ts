import { useEffect, useState } from "react";
import {
  Fraction,
  LimitOrder,
  parseUnits,
  REAL_ID_SHIFT,
  TokenAmount,
} from "@dusalabs/sdk";
import { useQuery } from "@tanstack/react-query";
import useFetchAllowance from "./useFetchAllowance";
import { useSendTransaction } from "./useSendTransaction";
import { ONE_DAY, U256_MAX } from "../utils/constants";
import { fetchPairInformationOpti } from "../utils/datastoreFetcher";
import {
  findLimitOrderPool,
  validateLimitOrderSupport,
  getPriceFromId,
  getIdFromPrice,
  roundFractionPriceAdaptive,
  toFraction,
  tokenAmountToSignificant,
} from "../utils/methods";
import { buildIncreaseAllowanceTx } from "../utils/transactionBuilder";
import type { Token } from "../utils/types";

type Allowance = "increase" | "increaseMax";

interface UseAdvancedManageOrdersParams {
  userAddress: string | undefined;
  token0: Token | undefined;
  token1: Token | undefined;
  resetTokensInputs?: () => void;
  amountIn: bigint;
  quantityIn: string | undefined;
  allowedSlippage: Fraction;
  fetchBalances?: () => void;
}

export const useAdvancedManageOrders = (
  params: UseAdvancedManageOrdersParams
) => {
  const {
    userAddress,
    token0,
    token1,
    resetTokensInputs,
    amountIn,
    quantityIn,
    allowedSlippage,
    fetchBalances,
  } = params;

  // Find the limit order pool for the selected tokens
  const limitOrderPool =
    token0 && token1 ? findLimitOrderPool(token0, token1) : undefined;

  // Get pool address and binStep from the found pool
  const pairAddress = limitOrderPool?.pairAddress;
  const binStep = limitOrderPool?.binStep || 0;
  const orderSC = limitOrderPool?.loSC;

  // Allowance state and logic
  const [allowanceType, setAllowanceType] = useState<Allowance>("increase");

  const [targetId, setTargetId] = useState(REAL_ID_SHIFT);
  const [limitValueDiff, setLimitValueDiff] = useState(0);
  const [targetPrice, setTargetPrice] = useState<Fraction>(new Fraction(1n));
  // Hard-coded infinite expiration (no date limit)
  const date = Date.now() + ONE_DAY * 365; // 1 year in the future (effectively infinite)
  const expiryDate = false; // Always infinite
  const [priceLODisplayed, setPriceLODisplayed] = useState("");

  const [priceLO, setPriceLO] = useState<Fraction | undefined>();
  const [isSellOrder, setIsSellOrder] = useState<boolean>(false);
  const [isPriceInverted, setIsPriceInverted] = useState<boolean>(false);
  const [limitOrderError, setLimitOrderError] = useState<string | null>(null);

  // Fetch pair information using fetchPairInformationOpti exactly like Dusa
  const pairInfoQuery = useQuery(
    ["pairInformation", pairAddress],
    () => fetchPairInformationOpti(pairAddress!),
    { enabled: !!pairAddress }
  );
  const activeId = pairInfoQuery.data?.activeId;

  // Fetch allowance for the token
  const allowanceQuery = useFetchAllowance({
    tokenAddress: token0?.address,
    spenderAddress: orderSC || "",
  });
  const allowance = allowanceQuery.data || 0n;

  // Allowance transaction
  const { submitTx: submitIncreaseAllowanceTx, pending: pendingAllowance } =
    useSendTransaction({
      data: buildIncreaseAllowanceTx(
        token0?.address || "",
        orderSC || "",
        allowanceType === "increaseMax" ? U256_MAX : amountIn - allowance
      ),
      onTxConfirmed: () => {
        allowanceQuery.refetch();
      },
    });

  const tokensSet = !!token0 && !!token1;

  // Check if limit orders are supported for the selected tokens
  useEffect(() => {
    if (tokensSet) {
      const validation = validateLimitOrderSupport(token0, token1);
      setLimitOrderError(validation.error || null);
    } else {
      setLimitOrderError(null);
    }
  }, [tokensSet, token0, token1]);

  // Auto-calculate default isSellOrder based on token order in pair
  useEffect(() => {
    if (limitOrderPool && token0) {
      // Check if token0 is TOKEN_X (first token in pair)
      const isToken0TokenX = limitOrderPool.token0.address === token0.address;
      // If token0 is TOKEN_X, we're buying TOKEN_Y, otherwise we're selling token0
      const defaultIsSellOrder = !isToken0TokenX;
      setIsSellOrder(defaultIsSellOrder);
    }
  }, [limitOrderPool, token0]);

  const orderType: 0 | 1 = isSellOrder ? 0 : 1;

  // Set input price based on ID
  const setInputPrice = (id: number) => {
    if (!tokensSet || activeId === undefined || !limitOrderPool) return;

    const priceAsNumber = getPriceFromId(id, binStep);
    const priceAsFraction = toFraction(priceAsNumber);

    // Use limitOrderPool for consistent decimal calculations
    const tokenX = limitOrderPool.token0; // TOKEN_X
    const tokenY = limitOrderPool.token1; // TOKEN_Y
    const decimalDiff = tokenX.decimals - tokenY.decimals;

    const multiplicator =
      decimalDiff > 0
        ? 10n ** BigInt(decimalDiff)
        : new Fraction(
            1n,
            10n ** BigInt(isNaN(-decimalDiff) ? 0 : -decimalDiff)
          );
    const priceAdjusted = priceAsFraction.multiply(multiplicator);

    // Base price for business logic (always consistent)
    const basePriceForLogic =
      isSellOrder && priceAdjusted.numerator !== 0n
        ? priceAdjusted.invert()
        : isSellOrder
          ? new Fraction(0n)
          : priceAdjusted;

    // Display price (can be inverted for UI)
    const displayPrice =
      isPriceInverted && basePriceForLogic.numerator !== 0n
        ? basePriceForLogic.invert()
        : basePriceForLogic;

    // Determine which tokens are displayed for adaptive decimals
    const baseToken = isSellOrder
      ? isPriceInverted
        ? token1!
        : token0!
      : isPriceInverted
        ? token1!
        : token0!;

    const adaptiveDisplayString = roundFractionPriceAdaptive(
      displayPrice,
      baseToken
    );

    setPriceLO(basePriceForLogic); // Keep business logic price
    setPriceLODisplayed(adaptiveDisplayString); // Use adaptive display price
  };

  useEffect(
    () => setInputPrice(targetId),
    [limitOrderPool, activeId, targetId, isSellOrder, isPriceInverted]
  );

  // Initialize targetId to activeId when activeId first becomes available
  useEffect(() => {
    if (activeId !== undefined && targetId === REAL_ID_SHIFT) {
      setTargetId(activeId + (isSellOrder ? -3 : 3));
      setLimitValueDiff(0);
    }
  }, [activeId, targetId, isSellOrder]);

  useEffect(() => {
    if (activeId !== undefined) {
      setInputPrice(activeId);
    }
  }, [activeId]);

  useEffect(() => {
    if (tokensSet && limitOrderPool) {
      const contractPrice = getPriceFromId(targetId, binStep);

      // Use limitOrderPool for consistent calculations
      const tokenX = limitOrderPool.token0; // TOKEN_X
      const tokenY = limitOrderPool.token1; // TOKEN_Y
      const decimalDiff = tokenX.decimals - tokenY.decimals;

      let targetPriceAsNumber: number;
      if (isSellOrder) {
        // Pour sell order: prix token1/token0 = (1/contractPrice) * 10^(tokenX.decimals - tokenY.decimals)
        const invertedPrice = 1 / contractPrice;
        targetPriceAsNumber = invertedPrice * 10 ** decimalDiff;
      } else {
        // Pour buy order: prix token0/token1 = contractPrice * 10^(tokenX.decimals - tokenY.decimals)
        targetPriceAsNumber = contractPrice * 10 ** decimalDiff;
      }

      const targetPriceAsFraction = toFraction(targetPriceAsNumber);

      setTargetPrice(targetPriceAsFraction);
      setLimitValueDiff(getDiffPricePct(targetId));
    }
  }, [targetId, limitOrderPool, isSellOrder]);

  // Calculate normalized price without decimal adjustment for amount calculations
  const normalizedPrice =
    tokensSet && limitOrderPool
      ? toFraction(getPriceFromId(targetId, binStep))
      : new Fraction(0n);

  // orderAmountIn should be the input amount the user is providing
  const orderAmountIn = amountIn;

  const orderAmountInDisplayed =
    token0 && orderAmountIn
      ? tokenAmountToSignificant(new TokenAmount(token0, orderAmountIn))
      : undefined;

  const orderAmountOut =
    tokensSet && normalizedPrice.denominator !== 0n && amountIn !== 0n
      ? isSellOrder
        ? normalizedPrice.numerator === 0n
          ? 0n
          : normalizedPrice.invert().multiply(amountIn).quotient
        : normalizedPrice.multiply(amountIn).quotient
      : undefined;

  const orderAmountOutMin = orderAmountOut
    ? orderAmountOut -
      (orderAmountOut * allowedSlippage.numerator) / allowedSlippage.denominator
    : undefined;

  const orderAmountOutDisplayed =
    token1 && orderAmountOut
      ? tokenAmountToSignificant(new TokenAmount(token1, orderAmountOut))
      : undefined;

  // Check if amount is invalid or allowance is insufficient
  const invalidAmountLimitOrder =
    amountIn === 0n ||
    !orderAmountOut ||
    (token0?.symbol !== "MAS" && amountIn > allowance);

  console.log({
    orderAmountIn,
    orderAmountOut,
    amountInALowa: amountIn > allowance,
    amountIn,
    allowance,
    invalidAmountLimitOrder,
  });

  const getDiffPricePct = (newId: number) => {
    const actualPrice = getPriceFromId(effectiveActiveId, binStep);
    const newPrice = getPriceFromId(newId, binStep);
    //take into account that the price is inverted if isSellOrder
    const pctDiff =
      (isSellOrder ? actualPrice / newPrice : newPrice / actualPrice) * 100 -
      100;

    return pctDiff;
  };

  const getCurrentBaseId = (): number => {
    // If no tokens or no displayed price, use targetId
    if (!tokensSet || !limitOrderPool || !priceLODisplayed) {
      return targetId;
    }

    // Calculate what the displayed price should be for the current targetId
    const expectedPriceForTargetId = getPriceFromId(targetId, binStep);
    const tokenX = limitOrderPool.token0;
    const tokenY = limitOrderPool.token1;
    const decimalDiff = tokenX.decimals - tokenY.decimals;

    // Calculate expected display price using same logic as setInputPrice
    const expectedPriceAdjusted = toFraction(expectedPriceForTargetId).multiply(
      decimalDiff > 0
        ? 10n ** BigInt(decimalDiff)
        : new Fraction(1n, 10n ** BigInt(-decimalDiff))
    );

    const expectedBasePriceForLogic =
      isSellOrder && expectedPriceAdjusted.numerator !== 0n
        ? expectedPriceAdjusted.invert()
        : isSellOrder
          ? new Fraction(0n)
          : expectedPriceAdjusted;

    const expectedDisplayPrice =
      isPriceInverted && expectedBasePriceForLogic.numerator !== 0n
        ? expectedBasePriceForLogic.invert()
        : expectedBasePriceForLogic;

    // Use adaptive display string for comparison
    const baseToken = isSellOrder
      ? isPriceInverted
        ? token1!
        : token0!
      : isPriceInverted
        ? token0!
        : token1!;
    const expectedDisplayString = roundFractionPriceAdaptive(
      expectedDisplayPrice,
      baseToken
    );

    // If displayed price matches expected or is very close (tolerance for precision differences), use current targetId
    const displayedPrice = parseFloat(priceLODisplayed);
    const expectedPrice = parseFloat(expectedDisplayString);

    // Use relative tolerance (0.001% difference) for price comparison instead of exact string matching
    const relativeThreshold = Math.max(
      Math.abs(expectedPrice) * 0.00001,
      1e-10
    );

    if (
      !isNaN(displayedPrice) &&
      !isNaN(expectedPrice) &&
      Math.abs(displayedPrice - expectedPrice) <= relativeThreshold
    ) {
      return targetId;
    }

    // Otherwise, calculate ID from the displayed price (same logic as handleBlur)
    const userPrice = parseFloat(priceLODisplayed);
    if (isNaN(userPrice) || userPrice <= 0) {
      return targetId;
    }

    // Use handleBlur logic to convert displayed price to contract price
    let basePriceForLogic: number;
    if (isPriceInverted) {
      basePriceForLogic = 1 / userPrice;
    } else {
      basePriceForLogic = userPrice;
    }

    let rawContractPrice: number;
    if (isSellOrder) {
      rawContractPrice = 1 / basePriceForLogic;
    } else {
      rawContractPrice = basePriceForLogic;
    }

    const contractPrice = rawContractPrice / 10 ** decimalDiff;
    const calculatedId = getIdFromPrice(contractPrice, binStep);

    return calculatedId;
  };

  const handleKeyDownLimit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();

    // Handle Enter key - trigger handleBlur
    if (e.key === "Enter") {
      e.preventDefault();
      handleBlur();
      return;
    }

    // Handle Arrow keys
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;

    e.preventDefault();
    const up = e.key === "ArrowUp";
    let direction = up ? 1 : -1;

    // If display is inverted, user expects opposite behavior
    if (isPriceInverted) {
      direction = -direction;
    }

    // Use intelligent base ID that considers user input
    const baseId = getCurrentBaseId();
    const newId = baseId + (isSellOrder ? -direction : direction);

    setLimitValueDiff(getDiffPricePct(newId));
    setTargetId(newId);
  };

  const handleBlur = () => {
    if (!!limitOrderPool && priceLODisplayed) {
      const userPrice = parseFloat(priceLODisplayed);
      if (isNaN(userPrice) || userPrice <= 0) return;

      // Use limitOrderPool for consistent calculations
      const tokenX = limitOrderPool.token0; // TOKEN_X
      const tokenY = limitOrderPool.token1; // TOKEN_Y
      const decimalDiff = tokenX.decimals - tokenY.decimals;

      // Convert user input back to contract price - reverse of setInputPrice logic

      // Step 1: Convert displayPrice back to basePriceForLogic
      let basePriceForLogic: number;
      if (isPriceInverted) {
        // If display is inverted, user entered inverted price, so we invert it back
        basePriceForLogic = 1 / userPrice;
      } else {
        // Display is normal, user price is already basePriceForLogic
        basePriceForLogic = userPrice;
      }

      // Step 2: Convert basePriceForLogic back to raw contract price
      let rawContractPrice: number;
      if (isSellOrder) {
        // In setInputPrice, we do: isSellOrder ? priceAdjusted.invert() : priceAdjusted
        // So to reverse: if isSellOrder, we need to invert basePriceForLogic to get priceAdjusted
        rawContractPrice = 1 / basePriceForLogic;
      } else {
        // For buy orders, basePriceForLogic = priceAdjusted
        rawContractPrice = basePriceForLogic;
      }

      // Step 3: Remove decimal adjustment to get the actual contract price
      const contractPrice = rawContractPrice / 10 ** decimalDiff;

      const id = getIdFromPrice(contractPrice, binStep);

      setTargetId(id);
      setInputPrice(id); // Force immediate update of displayed price
    }
  };

  const resetLimitValue = () => {
    if (activeId !== undefined) {
      setTargetId(activeId);
    }
    setLimitValueDiff(0);
  };

  useEffect(() => {
    if (activeId && targetId !== REAL_ID_SHIFT) {
      // Only adjust targetId if it's already been initialized (not at REAL_ID_SHIFT)
      // Calculate current difference between targetId and activeId
      const currentDiff = targetId - activeId;
      // Use absolute difference, with minimum fallback of 3 if no difference exists
      const absDiff = Math.abs(currentDiff) || 3;

      // Apply difference according to order type:
      // BUY ORDER: targetId = activeId - diff (buying at lower price)
      // SELL ORDER: targetId = activeId + diff (selling at higher price)
      const baseId = activeId + (isSellOrder ? -absDiff : absDiff);

      setTargetId(baseId);
      setLimitValueDiff(getDiffPricePct(baseId));
    }
  }, [activeId, isSellOrder, pairAddress]);

  // Initialize with a default activeId if none is available yet
  const effectiveActiveId = activeId ?? REAL_ID_SHIFT;

  // Reset targetId when pairAddress changes to ensure proper synchronization with new tokens
  useEffect(() => {
    if (pairAddress) {
      // Reset targetId to REAL_ID_SHIFT to trigger reinitialization for new pair
      setTargetId(REAL_ID_SHIFT);
      setLimitValueDiff(0);
    }
  }, [pairAddress]);

  return {
    // Pool and validation info
    limitOrderPool,
    pairAddress,
    binStep,
    orderSC,
    limitOrderError,
    isLimitOrderSupported: !!limitOrderPool,

    // Order state
    orderType,
    isSellOrder,
    setIsSellOrder,
    isPriceInverted,
    setIsPriceInverted,

    // Price and ID management
    targetId,
    setTargetId,
    targetPrice,
    limitValueDiff,
    setLimitValueDiff,
    activeId,

    // Price handling
    priceLO,
    setPriceLO,
    priceLODisplayed,
    setPriceLODisplayed,
    handleKeyDownLimit,
    handleBlur,
    setInputPrice,
    resetLimitValue,

    // Amount calculations
    orderAmountIn,
    orderAmountOut,
    orderAmountInDisplayed,
    orderAmountOutDisplayed,
    orderAmountOutMin,
    invalidAmountLimitOrder,

    // Allowance handling
    allowance,
    allowanceType,
    setAllowanceType,
    submitIncreaseAllowanceTx,
    pendingAllowance,

    // Date handling - hard-coded infinite expiration
    date,
    expiryDate,
  };
};
