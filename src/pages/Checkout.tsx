import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock, Check, Shield } from "lucide-react";
import Logo from "@/components/Logo";

const Checkout = () => {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Logo className="h-8" />
        </div>

        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Complete Your Subscription</h2>
          <p className="text-muted-foreground text-lg">
            Start working with your dedicated executive assistant today
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-card border border-border rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-xl">Payment Information</h3>
                <p className="text-muted-foreground text-sm">Enter your payment details securely</p>
              </div>
            </div>

            <form className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Billing Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@company.com"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="cardNumber" className="text-sm font-medium">
                  Card Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cardNumber"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="cardName" className="text-sm font-medium">
                  Cardholder Name <span className="text-destructive">*</span>
                </Label>
                <Input id="cardName" type="text" placeholder="John Smith" className="mt-2" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiry" className="text-sm font-medium">
                    Expiry Date <span className="text-destructive">*</span>
                  </Label>
                  <Input id="expiry" type="text" placeholder="MM/YY" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="cvv" className="text-sm font-medium">
                    CVV <span className="text-destructive">*</span>
                  </Label>
                  <Input id="cvv" type="text" placeholder="123" className="mt-2" />
                </div>
              </div>

              <div className="bg-info/10 border border-info/20 rounded-lg p-4 flex gap-3">
                <Shield className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-info font-medium">
                    <span className="font-bold">Secure Payment:</span> Your payment information is
                    encrypted and secure. We never store your card details.
                  </p>
                </div>
              </div>

              <Button className="w-full h-14 text-base font-semibold">
                <Lock className="w-5 h-5 mr-2" />
                Complete Purchase - $3000/month
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                By completing this purchase, you agree to our Terms of Service and Privacy Policy.
                You can cancel anytime.
              </p>
            </form>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8">
            <h3 className="font-bold text-xl mb-6">Order Summary</h3>

            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-border">
              <div className="w-16 h-16 bg-muted rounded-full flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-bold">Sarah Chen</h4>
                <p className="text-muted-foreground text-sm">Chief of Staff</p>
                <span className="inline-block mt-1 text-xs bg-success/10 text-success px-2 py-1 rounded-full font-medium">
                  Available
                </span>
              </div>
            </div>

            <div className="space-y-4 mb-8 pb-8 border-b border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hourly Rate:</span>
                <span className="font-semibold">$75/hour</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated Monthly Hours:</span>
                <span className="font-semibold">40 hours</span>
              </div>
            </div>

            <div className="mb-8 pb-8 border-b border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Monthly Total:</span>
                <span className="text-2xl font-bold text-primary">$3000/month</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">What's Included:</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Dedicated executive assistant</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Priority task management</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm">24/7 communication access</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Full-service task execution</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Cancel anytime</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
