import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import useTheme, { type ThemeMode } from "@/hooks/use-theme";
import useLocalPreferences from "@/hooks/use-local-preferences";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Monitor,
  Moon,
  Sparkles,
  Sun,
  UserRound,
  Palette,
  Rows3,
  LayoutList,
} from "lucide-react";

interface OnboardingProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const STEPS = [
  { key: "welcome", title: "Welcome aboard", icon: Sparkles, hint: "A quick 3-step setup" },
  { key: "about", title: "About you", icon: UserRound, hint: "Helps us personalise Admiino" },
  { key: "appearance", title: "Appearance", icon: Palette, hint: "Choose how Admiino looks" },
] as const;

export default function OnboardingProfileModal({
  isOpen,
  onClose,
  onSuccess,
}: OnboardingProfileModalProps) {
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { refreshUser, user } = useAuth() as any;
  const { theme, setTheme } = useTheme();
  const { prefs, update } = useLocalPreferences();

  const firstName = useMemo(
    () => user?.firstName || user?.first_name || user?.name?.split(" ")?.[0] || "",
    [user]
  );

  const total = STEPS.length;
  const progress = ((step + 1) / total) * 100;

  const handleClose = () => {
    setStep(0);
    onClose();
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const payload: any = {};
      if (gender) payload.gender = gender;
      if (age) payload.age = Number(age);

      if (Object.keys(payload).length > 0) {
        await api.updateOnboarding(payload);
      }
      toast({ title: "You're all set", description: "Your preferences have been saved." });
      if (refreshUser) await refreshUser();
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err: any) {
      toast({
        title: "Couldn't save",
        description: err?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const ActiveIcon = STEPS[step].icon;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="p-0 overflow-hidden sm:max-w-[560px] border-border/70">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-6 pt-6 pb-5">
          <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-primary/20 blur-3xl animate-pulse" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary animate-scale-in">
              <ActiveIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight">
                {step === 0 && firstName ? `Welcome, ${firstName}` : STEPS[step].title}
              </h2>
              <p className="text-sm text-muted-foreground">{STEPS[step].hint}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="relative mt-5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <span>
                Step {step + 1} of {total}
              </span>
              <span>{STEPS[step].title}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div key={step} className="px-6 py-6 animate-fade-in">
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Let&apos;s take a moment to set up your workspace. You&apos;ll tell us a little about
                yourself and pick how Admiino should look. It takes less than a minute, and you can
                change everything later in Settings.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {STEPS.map((s, i) => (
                  <div
                    key={s.key}
                    className="rounded-xl border border-border/70 bg-muted/30 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft animate-fade-in"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <s.icon className="mb-2 h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{s.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger id="gender" className="h-10">
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non_binary">Non-binary</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="age">Age (optional)</Label>
                <Input
                  id="age"
                  type="number"
                  min={13}
                  max={120}
                  placeholder="Enter your age"
                  className="h-10"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Only used to personalise your experience. You can skip this.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Theme</Label>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map((opt) => {
                    const active = theme === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTheme(opt.value)}
                        className={`group flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5 ${
                          active
                            ? "border-primary bg-primary/10 shadow-soft"
                            : "border-border/70 bg-muted/20 hover:border-primary/40"
                        }`}
                      >
                        <opt.icon
                          className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${
                            active ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <span className="text-xs font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Layout density</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { value: "comfortable", label: "Comfortable", icon: Rows3 },
                      { value: "compact", label: "Compact", icon: LayoutList },
                    ] as const
                  ).map((opt) => {
                    const active = prefs.density === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update("density", opt.value)}
                        className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all duration-300 hover:-translate-y-0.5 ${
                          active
                            ? "border-primary bg-primary/10 shadow-soft"
                            : "border-border/70 bg-muted/20 hover:border-primary/40"
                        }`}
                      >
                        <opt.icon
                          className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`}
                        />
                        <span className="text-xs font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3">
                <div className="pr-4">
                  <p className="text-sm font-medium">Reduce motion</p>
                  <p className="text-xs text-muted-foreground">
                    Minimise animations and transitions across the app.
                  </p>
                </div>
                <Switch
                  checked={prefs.reduceMotion}
                  onCheckedChange={(v) => update("reduceMotion", v)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-6 py-4">
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s.key}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-foreground/15"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 ? (
              <Button
                variant="ghost"
                onClick={() => setStep((s) => s - 1)}
                disabled={loading}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={handleClose} disabled={loading}>
                Skip for now
              </Button>
            )}

            {step < total - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} className="gap-1.5 group">
                Continue
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={loading} className="gap-1.5">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Finish setup
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
