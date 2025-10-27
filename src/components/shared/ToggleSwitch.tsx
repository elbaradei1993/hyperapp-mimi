import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: {
      container: 'w-8 h-4',
      knob: 'w-3 h-3',
      translate: 'translate-x-4'
    },
    md: {
      container: 'w-11 h-6',
      knob: 'w-5 h-5',
      translate: 'translate-x-5'
    },
    lg: {
      container: 'w-14 h-7',
      knob: 'w-6 h-6',
      translate: 'translate-x-7'
    }
  };

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div
      className={`relative inline-flex ${sizeClasses[size].container} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="switch"
      aria-checked={checked ? 'true' : 'false'}
      aria-disabled={disabled ? 'true' : 'false'}
    >
      <div
        className={`${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} relative inline-flex ${
          sizeClasses[size].container
        } items-center rounded-full transition-colors duration-200 ease-in-out`}
      >
        <span
          className={`${
            checked ? sizeClasses[size].translate : 'translate-x-0.5'
          } inline-block ${sizeClasses[size].knob} transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out`}
        />
      </div>
    </div>
  );
};

export default ToggleSwitch;
