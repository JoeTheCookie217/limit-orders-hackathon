import { useEffect, useState } from 'react';
import TimePicker from '../TimePicker';
import PriceChart from '../PriceChart';
import {
  formatNumberWithSubscriptZeros,
  printDate
} from '../../utils/chartHelpers';
import { Price, TimeWindow, Token } from '../../utils/types';
import { trpc } from '../../utils/trpc';
import './index.scss';

interface PriceChartContainerProps {
  poolAddress: string;
  token0: Token;
  token1: Token;
}

const PriceChartContainer: React.FC<PriceChartContainerProps> = ({
  poolAddress,
  token0,
  token1
}) => {
  const [timeWindow, setTimeWindow] = useState(TimeWindow.Week);
  const [hoverValue, setHoverValue] = useState(0);
  const [hoverDate, setHoverDate] = useState(printDate(new Date()));

  // Price adjustment function to handle token decimals
  // We display token1/token0 (e.g., USDC/MASSA)
  // Formula from Dusa: price * 10^(token1.decimals - token0.decimals)
  // For USDC(6)/MASSA(9): price * 10^(6-9) = price / 1000
  const adjustPrice = (rawPrice: number): number => {
    return 1 / (rawPrice * Math.pow(10, token1.decimals));
  };

  const {
    data: priceData,
    isLoading,
    isError
  } = trpc.getPrice.useQuery(
    { poolAddress, take: timeWindow },
    {
      enabled: !!poolAddress,
      refetchOnWindowFocus: true,
      staleTime: 30000 // 30 seconds cache
    }
  );

  useEffect(() => {
    if (priceData && priceData.length > 0) {
      const latestPrice = adjustPrice(priceData[priceData.length - 1].close);
      setHoverValue(latestPrice);
      setHoverDate(printDate(new Date(priceData[priceData.length - 1].date)));
    }
  }, [priceData]);

  // Calculate price change with adjusted prices
  const originalPrice = priceData?.length ? adjustPrice(priceData[0].close) : 0;
  const newPrice = priceData?.length
    ? adjustPrice(priceData[priceData.length - 1].close)
    : 0;
  const change = newPrice - originalPrice;
  const difference = Math.abs(change);
  const changePercentage =
    originalPrice !== 0 ? (difference / originalPrice) * 100 : 0;
  const positive = change >= 0;

  // Adjust all price data for the chart
  const adjustedPriceData = priceData?.map((price) => ({
    ...price,
    open: adjustPrice(price.open),
    close: adjustPrice(price.close),
    high: adjustPrice(price.high),
    low: adjustPrice(price.low)
  }));

  return (
    <div className='price-chart-container'>
      <div className='price-chart-container__header'>
        <div className='price-chart-container__tokens'>
          <div className='token-pair'>
            <img
              src={token1.logoURI}
              alt={token1.symbol}
              className='token-logo'
            />
            <span className='token-symbol'>{token1.symbol}</span>
            <span className='separator'>/</span>
            <img
              src={token0.logoURI}
              alt={token0.symbol}
              className='token-logo'
            />
            <span className='token-symbol'>{token0.symbol}</span>
          </div>
        </div>

        <TimePicker
          timeWindow={timeWindow}
          setTimeWindow={setTimeWindow}
          values={[TimeWindow.Day, TimeWindow.Week, TimeWindow.Month]}
        />
      </div>

      <div className='price-chart-container__price-info'>
        <div className='price-display'>
          <div className='price-value'>
            {formatNumberWithSubscriptZeros(hoverValue, 6)}
          </div>
          <div className='price-date'>{hoverDate}</div>
        </div>

        {priceData && priceData.length > 0 && (
          <div className={`price-change ${positive ? 'positive' : 'negative'}`}>
            <span className='change-symbol'>{positive ? '+' : '-'}</span>
            <span className='change-amount'>
              {formatNumberWithSubscriptZeros(difference, 6)}
            </span>
            <span className='change-percentage'>
              ({changePercentage.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      <div className='price-chart-container__chart'>
        {isLoading && (
          <div className='loading-state'>
            <div className='spinner'></div>
            <p>Loading price data...</p>
          </div>
        )}

        {isError && (
          <div className='error-state'>
            <p>Unable to load price data</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {!isLoading &&
          !isError &&
          adjustedPriceData &&
          adjustedPriceData.length > 0 && (
            <PriceChart
              data={adjustedPriceData as Price[]}
              timeWindow={timeWindow}
              setHoverValue={setHoverValue}
              setHoverDate={setHoverDate}
              positive={positive}
            />
          )}

        {!isLoading &&
          !isError &&
          (!adjustedPriceData || adjustedPriceData.length === 0) && (
            <div className='empty-state'>
              <p>No price history available</p>
            </div>
          )}
      </div>
    </div>
  );
};

export default PriceChartContainer;
