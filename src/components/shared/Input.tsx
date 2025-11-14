import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const Input: React.FC<InputProps> = ({ label, id, ...props }) => {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">
        {label}
      </label>
      <input
        id={id}
        className="w-full px-3 py-2 border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent-primary focus:border-accent-primary bg-bg-primary text-text-primary"
        {...props}
      />
    </div>
  );
};

export default Input;
