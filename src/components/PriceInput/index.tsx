import React from 'react';
import { faArrowsRotate, faRightLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Input from 'components/Input';
import Skeleton from 'components/Skeleton';
import './index.scss';

interface PriceInputProps {
  // Price values
  price: string;
  onPriceChange: (price: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;

  // Display state
  isLoading?: boolean;
  isDisabled?: boolean;
  limitValueDiff?: number;
  isPriceInverted?: boolean;
  onTogglePriceInverted?: () => void;

  // Tokens
  baseTokenSymbol?: string;
  quoteTokenSymbol?: string;

  // Actions
  onResetToMarket?: () => void;

  // Input props
  placeholder?: string;
  rightAddon?: React.ReactNode;
}

const PriceInput: React.FC<PriceInputProps> = ({
  price,
  onPriceChange,
  onKeyDown,
  onBlur,
  isLoading = false,
  isDisabled = false,
  limitValueDiff,
  isPriceInverted = false,
  onTogglePriceInverted,
  baseTokenSymbol,
  quoteTokenSymbol,
  onResetToMarket,
  placeholder = '0.0',
  rightAddon,
}) => {
  return (
    <div className={`price-input ${isDisabled ? 'price-input--disabled' : ''}`}>
      <div className="price-input__header">
        <div className="price-input__label-section">
          <span className="price-input__label">PRICE</span>
          {limitValueDiff !== undefined && !isDisabled && price && (
            <span
              className={`price-input__diff ${
                limitValueDiff < 0
                  ? 'price-input__diff--below'
                  : limitValueDiff > 0
                    ? 'price-input__diff--above'
                    : ''
              }`}
            >
              ({(limitValueDiff > 0 ? '+' : '') + limitValueDiff.toFixed(2)}
              %)
            </span>
          )}
        </div>
        {onResetToMarket && !isDisabled && (
          <button
            className="price-input__reset-btn"
            onClick={onResetToMarket}
            type="button"
          >
            <FontAwesomeIcon icon={faArrowsRotate} />
            <span>MARKET</span>
          </button>
        )}
      </div>

      <div className="price-input__input-section">
        {isLoading ? (
          <Skeleton className="price-input__skeleton" />
        ) : (
          <Input
            type="number"
            step="any"
            value={isDisabled ? '' : price}
            placeholder={isDisabled ? '—' : placeholder}
            onChange={(e) => {
              if (!isDisabled) {
                onPriceChange(e.target.value);
              }
            }}
            onKeyDown={!isDisabled ? onKeyDown : undefined}
            onBlur={!isDisabled ? onBlur : undefined}
            disabled={isDisabled}
            rightAddon={rightAddon}
            className="price-input__field"
          />
        )}

        {/* Price inversion toggle */}
        {onTogglePriceInverted &&
          baseTokenSymbol &&
          quoteTokenSymbol &&
          !isDisabled && (
            <div className="price-input__footer">
              <button
                className="price-input__invert-btn"
                onClick={onTogglePriceInverted}
                type="button"
              >
                <span>
                  {isPriceInverted ? quoteTokenSymbol : baseTokenSymbol}
                </span>
                <FontAwesomeIcon icon={faRightLeft} />
              </button>
            </div>
          )}
      </div>

      {/* Help text for keyboard shortcuts */}
      {!isDisabled && (
        <div className="price-input__help">
          <span className="price-input__help-text">
            Use ↑/↓ arrow keys to adjust price by bin step
          </span>
        </div>
      )}
    </div>
  );
};

export default PriceInput;
