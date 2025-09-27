import React from 'react';

const Logo = ({ className = "", size = "default" }) => {
  const sizeClasses = {
    small: "text-lg",
    default: "text-2xl",
    large: "text-3xl"
  };

  return (
    <div className={`font-bold text-primary flex items-center gap-2 ${sizeClasses[size]} ${className}`}>
      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
        DW
      </div>
      <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        DeWages
      </span>
    </div>
  );
};

export default Logo;