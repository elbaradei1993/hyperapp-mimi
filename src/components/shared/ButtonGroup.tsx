import React from 'react';
import Button from './Button';

interface ButtonGroupProps {
  children: React.ReactNode;
  layout?: 'grid-2' | 'grid-3' | 'stack';
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  layout = 'stack',
  gap = 'md',
  className = ''
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
  };

  const layoutClasses = {
    'grid-2': 'grid grid-cols-2',
    'grid-3': 'grid grid-cols-3',
    'stack': 'flex flex-col'
  };

  // Clone children and add mobileLayout prop based on layout
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === Button) {
      return React.cloneElement(child as React.ReactElement<any>, {
        mobileLayout: layout === 'stack' ? 'full-width' : layout
      });
    }
    return child;
  });

  const classes = `${layoutClasses[layout]} ${gapClasses[gap]} ${className}`.trim();

  return (
    <div className={classes}>
      {enhancedChildren}
    </div>
  );
};

export default ButtonGroup;
