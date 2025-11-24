import React, { useEffect } from 'react';
import {
  AreaChart,
  ResponsiveContainer,
  YAxis,
  XAxis,
  Tooltip,
  Area
} from 'recharts';
import { printDate } from '../../utils/chartHelpers';
import { Price, TimeWindow } from '../../utils/types';
import './index.scss';

interface HoverUpdaterProps {
  payload: Price;
  setHoverValue: React.Dispatch<React.SetStateAction<number>>;
  setHoverDate: React.Dispatch<React.SetStateAction<string>>;
  defaultValue: number;
  defaultDate: Date | string;
}

// Calls setHoverValue and setHoverDate when part of chart is hovered
const HoverUpdater: React.FC<HoverUpdaterProps> = ({
  payload,
  setHoverValue,
  setHoverDate,
  defaultValue,
  defaultDate
}) => {
  useEffect(() => {
    if (payload) {
      setHoverValue(payload.close);
      setHoverDate(printDate(new Date(payload.date)));
    }

    return () => {
      setHoverValue(defaultValue);
      setHoverDate(printDate(new Date(defaultDate)));
    };
  }, [payload, setHoverValue, setHoverDate, defaultValue, defaultDate]);

  return null;
};

interface PriceChartProps {
  data: Price[];
  timeWindow: TimeWindow;
  setHoverValue: React.Dispatch<React.SetStateAction<number>>;
  setHoverDate: React.Dispatch<React.SetStateAction<string>>;
  positive: boolean;
}

const PriceChart: React.FC<PriceChartProps> = ({
  data,
  timeWindow,
  setHoverValue,
  setHoverDate,
  positive
}) => {
  const color = positive ? 'var(--success-color)' : 'var(--secondary-color)';

  return (
    <div className="price-chart">
      {data && data.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="75%" stopColor={color} stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="close"
              stroke={color}
              strokeWidth={2}
              fill="url(#colorPrice)"
              isAnimationActive={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tickFormatter={(str) => printDate(new Date(str), timeWindow)}
              minTickGap={5}
              style={{ fontSize: '12px', fill: 'var(--text-secondary)' }}
            />
            <YAxis
              dataKey="close"
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
              hide
            />
            <Tooltip
              contentStyle={{ display: 'none' }}
              formatter={(_tooltipValue: any, _name: any, props: any) => (
                <HoverUpdater
                  payload={props.payload}
                  setHoverValue={setHoverValue}
                  setHoverDate={setHoverDate}
                  defaultValue={data[data.length - 1].close}
                  defaultDate={new Date(data[data.length - 1].date)}
                />
              )}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default PriceChart;
