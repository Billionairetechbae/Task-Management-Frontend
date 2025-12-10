import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const ResetPassword = () => {
  const { token } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password strength calculation
  const calculatePasswordStrength = (pwd: string) => {
    let score = 0;
    const requirements = {
      length: false,
      lowercase: false,
      uppercase: false,
      number: false,
      special: false,
    };

    if (pwd.length >= 8) {
      score += 1;
      requirements.length = true;
    }
    if (/[a-z]/.test(pwd)) {
      score += 1;
      requirements.lowercase = true;
    }
    if (/[A-Z]/.test(pwd)) {
      score += 1;
      requirements.uppercase = true;
    }
    if (/[0-9]/.test(pwd)) {
      score += 1;
      requirements.number = true;
    }
    if (/[^A-Za-z0-9]/.test(pwd)) {
      score += 1;
      requirements.special = true;
    }

    return { score, requirements };
  };

  const { score, requirements } = calculatePasswordStrength(password);

  const getStrengthText = () => {
    if (password.length === 0) return "Enter a password";
    if (score <= 2) return "Weak";
    if (score <= 3) return "Fair";
    if (score <= 4) return "Good";
    return "Strong";
  };

  const getStrengthColor = () => {
    if (password.length === 0) return "bg-gray-200";
    if (score <= 2) return "bg-red-500";
    if (score <= 3) return "bg-yellow-500";
    if (score <= 4) return "bg-blue-500";
    return "bg-green-500";
  };

  const getStrengthWidth = () => {
    if (password.length === 0) return "0%";
    if (score <= 2) return "25%";
    if (score <= 3) return "50%";
    if (score <= 4) return "75%";
    return "100%";
  };

  // Validation
  const passwordsMatch = password === confirmPassword;
  const isPasswordValid = password.length >= 8 && score >= 3; // At least "Fair" strength
  const canSubmit = isPasswordValid && passwordsMatch && password.length > 0;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors above before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await api.request(`/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      setDone(true);
      toast({ 
        title: "Password Reset Successful!", 
        description: "You can now log in with your new password." 
      });

      setTimeout(() => navigate("/"), 1500);

    } catch (err: any) {
      toast({
        title: "Reset Failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-lg">
        {!done ? (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Reset Your Password
              </h2>
              <p className="text-gray-600 text-sm">
                Please enter your new password below
              </p>
            </div>

            <form onSubmit={handleReset} className="space-y-6">
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    placeholder="Enter your new password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-700">
                        Password Strength:{" "}
                        <span className={`font-bold ${
                          score <= 2 ? "text-red-600" :
                          score <= 3 ? "text-yellow-600" :
                          score <= 4 ? "text-blue-600" : "text-green-600"
                        }`}>
                          {getStrengthText()}
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                        style={{ width: getStrengthWidth() }}
                      />
                    </div>

                    {/* Password Requirements */}
                    <div className="space-y-1 pt-2">
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        Requirements:
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {requirements.length ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          <span className={`text-xs ${requirements.length ? "text-green-600" : "text-red-600"}`}>
                            At least 8 characters
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {requirements.lowercase ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          <span className={`text-xs ${requirements.lowercase ? "text-green-600" : "text-red-600"}`}>
                            Contains lowercase letter
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {requirements.uppercase ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          <span className={`text-xs ${requirements.uppercase ? "text-green-600" : "text-red-600"}`}>
                            Contains uppercase letter
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {requirements.number ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          <span className={`text-xs ${requirements.number ? "text-green-600" : "text-red-600"}`}>
                            Contains number
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {requirements.special ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          <span className={`text-xs ${requirements.special ? "text-green-600" : "text-red-600"}`}>
                            Contains special character
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pr-10 ${!passwordsMatch && confirmPassword.length > 0 ? "border-red-300 focus-visible:ring-red-500" : ""}`}
                    placeholder="Re-enter your new password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                
                {/* Password Match Indicator */}
                {confirmPassword.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    {passwordsMatch ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-green-600 font-medium">
                          Passwords match
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-xs text-red-600 font-medium">
                          Passwords do not match
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-12 bg-primary hover:bg-primary/90"
                disabled={!canSubmit || loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Resetting Password...</span>
                  </div>
                ) : (
                  "Reset Password"
                )}
              </Button>

              {/* Back to Login Link */}
              <div className="text-center pt-4">
                <Link
                  to="/"
                  className="text-sm text-primary hover:text-primary/80 hover:underline"
                >
                  ← Back to Login
                </Link>
              </div>
            </form>
          </>
        ) : (
          // Success State
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-700 mb-3">
              Password Updated Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Your password has been reset. You will be redirected to the login page shortly.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 text-primary hover:text-primary/80 hover:underline font-medium"
            >
              Return to Login
            </Link>
            <div className="mt-6 text-xs text-gray-500">
              <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 animate-[progress_1.5s_ease-in-out]"></div>
              </div>
              <p className="mt-2">Redirecting...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;