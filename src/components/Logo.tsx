import logo from "@/assets/logo.png";

interface LogoProps {
  className?: string;
}

const Logo = ({ className = "h-8" }: LogoProps) => {
  return (
    <img 
      src={logo} 
      alt="Admiino" 
      className={className}
    />
  );
};

export default Logo;
