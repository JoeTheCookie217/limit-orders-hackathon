import clsx from 'clsx';
import { TimeWindow } from '../../utils/types';
import './index.scss';

interface TimePickerProps {
  timeWindow: TimeWindow;
  setTimeWindow: (window: TimeWindow) => void;
  values: TimeWindow[];
}

const TimePicker: React.FC<TimePickerProps> = ({
  timeWindow,
  setTimeWindow,
  values
}) => {
  const getLabel = (window: TimeWindow): string => {
    switch (window) {
      case TimeWindow.Day:
        return '1D';
      case TimeWindow.Week:
        return '7D';
      case TimeWindow.Month:
        return '30D';
      default:
        return `${window}D`;
    }
  };

  return (
    <div className="time-picker">
      {values.map((window) => (
        <button
          key={window}
          className={clsx('time-picker__button', {
            'time-picker__button--active': timeWindow === window
          })}
          onClick={() => setTimeWindow(window)}
        >
          {getLabel(window)}
        </button>
      ))}
    </div>
  );
};

export default TimePicker;
