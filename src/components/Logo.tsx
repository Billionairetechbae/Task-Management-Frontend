interface LogoProps {
  className?: string;
}

const Logo = ({ className = "h-8" }: LogoProps) => {
  return (
    <img 
      src="/logo.png" 
      alt="Admiino" 
      className={className}
    /> 
  );
};

export default Logo;
