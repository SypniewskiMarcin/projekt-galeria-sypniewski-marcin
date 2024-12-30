interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

/**
 * Komponent LoadingSpinner wyświetlający animację ładowania
 * @param {LoadingSpinnerProps} props - Właściwości komponentu
 * @returns {JSX.Element} - Wyrenderowany komponent LoadingSpinner
 */
const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue-500' 
}: LoadingSpinnerProps) => {
  // Mapowanie rozmiarów na odpowiednie klasy Tailwind
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className="flex items-center justify-center">
      <div 
        className={`${sizeClasses[size]} animate-spin rounded-full border-t-2 border-b-2 border-${color}`}
        role="status"
        aria-label="Ładowanie"
      >
        <span className="sr-only">Ładowanie...</span>
      </div>
    </div>
  );
};

export default LoadingSpinner; 