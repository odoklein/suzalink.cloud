import * as React from 'react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked, onCheckedChange, className = '', ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      checked={checked}
      onChange={e => onCheckedChange?.(e.target.checked)}
      className={
        'w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500 ' +
        className
      }
      {...props}
    />
  )
);
Checkbox.displayName = 'Checkbox'; 