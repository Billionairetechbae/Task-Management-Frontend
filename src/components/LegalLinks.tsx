import { Link } from "react-router-dom";

export const SUPPORT_EMAIL = "contact@admiino.com";
export const TERMS_URL = "https://www.admiino.com/terms";
export const PRIVACY_URL = "https://www.admiino.com/privacy";

export const LegalLinks = ({ className = "" }: { className?: string }) => (
  <div
    className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground ${className}`}
  >
    <a
      href={TERMS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-foreground underline transition-colors duration-150"
    >
      Terms
    </a>
    <span className="opacity-40">•</span>
    <a
      href={PRIVACY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-foreground underline transition-colors duration-150"
    >
      Privacy Policy
    </a>
    <span className="opacity-40">•</span>
    <Link to="/help" className="hover:text-foreground underline transition-colors duration-150">
      Help &amp; Support
    </Link>
  </div>
);

export default LegalLinks;
