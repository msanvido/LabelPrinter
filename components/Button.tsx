import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  children, 
  variant = "primary", 
  className = "", 
  disabled = false, 
  type = "button",
  ...props
}) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow active:scale-95",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95",
    outline: "border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 active:scale-95 bg-white",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 px-2 active:bg-slate-200"
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      disabled={disabled} 
      {...props}
    >
      {children}
    </button>
  );
};