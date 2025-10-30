import React from 'react';

interface QuickActionProps {
  icon: string;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
}

interface QuickActionsProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const QuickAction: React.FC<QuickActionProps> = ({
  icon,
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  className = ''
}) => {
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/25',
    secondary: 'bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-900 shadow-gray-500/25 dark:from-gray-700 dark:to-gray-600 dark:hover:from-gray-600 dark:hover:to-gray-500 dark:text-white',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-red-500/25'
  };

  const classes = `
    flex flex-col items-center justify-center
    min-h-[80px] p-3 rounded-xl
    font-semibold text-center
    transition-all duration-300 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
    active:scale-[0.96]
    shadow-sm hover:shadow-lg
    border border-transparent
    touch-manipulation
    select-none
    ${variantClasses[variant]}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `.trim();

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <span className="text-2xl mb-1" role="img" aria-hidden="true">
        {icon}
      </span>
      <span className="text-xs leading-tight break-words max-w-full">
        {label}
      </span>
    </button>
  );
};

const QuickActions: React.FC<QuickActionsProps> = ({
  children,
  columns = 2,
  gap = 'md',
  className = ''
}) => {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4'
  };

  const classes = `
    grid ${columnClasses[columns]} ${gapClasses[gap]}
    p-4
    ${className}
  `.trim();

  return (
    <div className={classes}>
      {children}
    </div>
  );
};

// Export both components
export { QuickAction };
export default QuickActions;
