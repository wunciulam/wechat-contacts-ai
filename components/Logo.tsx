import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 40, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 40 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 外圈 - 保险盾牌轮廓 */}
      <path 
        d="M20 4L6 10V18C6 28 20 36 20 36C20 36 34 28 34 18V10L20 4Z" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* 内对勾 - 跟单完成 */}
      <path 
        d="M14 20L18 24L26 16" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* 顶部装饰点 */}
      <circle 
        cx="20" 
        cy="12" 
        r="2" 
        fill="currentColor"
      />
    </svg>
  );
};

export default Logo;
