import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, FileText, ShieldCheck, ArrowLeft, LifeBuoy } from "lucide-react";
import Logo from "@/components/Logo";
import { SUPPORT_EMAIL, TERMS_URL, PRIVACY_URL } from "@/components/LegalLinks";

const Help = () => {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="mb-10">
          <Logo className="h-8 mb-6" />
          <div className="flex items-center gap-3 mb-2">
            <LifeBuoy className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Help &amp; Support</h1>
          </div>
          <p className="text-muted-foreground">
            Questions about your account, workspace, or billing? Our team is here to help.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="sm:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="w-5 h-5 text-primary" />
                Contact support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Email us with your workspace name and a short description of the issue, and we&apos;ll
                get back to you.
              </p>
              <Button asChild>
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-primary" />
                Terms of Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">
                  Read the Terms
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Privacy Policy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
                  Read the Policy
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Help;
