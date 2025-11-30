import React from 'react';

interface CardProps {
  type: 'image' | 'word';
  content: string;
  revealed: boolean;
  delay?: number;
  className?: string;
}

const Card: React.FC<CardProps> = ({ type, content, revealed, delay = 0, className = '' }) => {
  return (
    <div 
      className={`relative perspective-1000 transition-all duration-1000 ease-in-out transform ${revealed ? 'rotate-y-0' : 'rotate-y-180'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Front of Card (Content) */}
      <div 
        className={`absolute inset-0 backface-hidden rounded-lg md:rounded-xl card-shadow overflow-hidden border-[3px] md:border-4 border-white bg-white flex items-center justify-center
        ${!revealed ? 'hidden' : 'block'} transition-opacity duration-500
        `}
      >
        {type === 'image' ? (
          <img 
            src={content} 
            alt="OH Card" 
            className="w-full h-full object-cover filter sepia-[0.1] contrast-[0.95]" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#fbf7f0]">
             <span className="serif text-2xl md:text-4xl font-bold text-gray-800 tracking-widest text-center px-2">
               {content}
             </span>
          </div>
        )}
      </div>

      {/* Back of Card (Cover) */}
      <div 
        className={`absolute inset-0 backface-hidden rounded-lg md:rounded-xl card-shadow bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center
        ${revealed ? 'hidden' : 'block'}
        `}
      >
        <div className="border-2 border-white/20 w-[90%] h-[90%] rounded md:rounded-lg flex items-center justify-center">
            <span className="text-white/30 font-serif text-lg tracking-[0.2em]">OH</span>
        </div>
      </div>
    </div>
  );
};

export default Card;