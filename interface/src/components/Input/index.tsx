import React, { forwardRef } from 'react';
import clsx from 'clsx';
import './index.scss';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  fullWidth?: boolean;
  variant?: 'default' | 'filled' | 'outline';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftAddon,
      rightAddon,
      fullWidth = false,
      variant = 'default',
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        className={clsx(
          'input-group',
          {
            'input-group--full-width': fullWidth,
            'input-group--error': error,
            'input-group--disabled': disabled,
          },
          className,
        )}
      >
        {label && <label className="input-group__label">{label}</label>}

        <div
          className={clsx('input-wrapper', `input-wrapper--${variant}`, {
            'input-wrapper--has-left-addon': leftAddon,
            'input-wrapper--has-right-addon': rightAddon,
          })}
        >
          {leftAddon && (
            <div className="input-wrapper__left-addon">{leftAddon}</div>
          )}

          <input
            ref={ref}
            className={clsx('input', {
              'input--with-left-addon': leftAddon,
              'input--with-right-addon': rightAddon,
            })}
            disabled={disabled}
            inputMode={props.type === 'number' ? 'decimal' : undefined}
            {...props}
          />

          {rightAddon && (
            <div className="input-wrapper__right-addon">{rightAddon}</div>
          )}
        </div>

        {(error || helperText) && (
          <div
            className={clsx('input-group__helper', {
              'input-group__helper--error': error,
            })}
          >
            {error || helperText}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
