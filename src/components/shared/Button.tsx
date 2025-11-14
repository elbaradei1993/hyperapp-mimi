import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'success' | 'danger';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'px-4 py-2 rounded-md font-semibold focus:outline-none';
  
  const variantClasses = {
    primary: 'bg-accent-primary text-white hover:bg-accent-primary-dark',
    success: 'bg-success text-white hover:bg-success-dark',
    danger: 'bg-danger text-white hover:bg-danger-dark',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;