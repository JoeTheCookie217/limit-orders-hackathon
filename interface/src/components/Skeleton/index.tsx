import React from 'react';
import './index.scss';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  className = '',
  style = {},
}) => {
  const combinedStyle = {
    width,
    height,
    ...style,
  };

  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={combinedStyle}
      aria-label="Loading..."
    />
  );
};

export default Skeleton;
