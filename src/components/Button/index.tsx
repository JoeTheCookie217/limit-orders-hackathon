import React from 'react';
import clsx from 'clsx';
import './index.scss';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  disabled,
  children,
  ...props
}) => {
  return (
    <button
      className={clsx(
        'button',
        `button--${variant}`,
        `button--${size}`,
        {
          'button--loading': loading,
          'button--full-width': fullWidth,
        },
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <div className="button__spinner" /> : children}
    </button>
  );
};

export default Button;
