import { BadgeCheck, ListChecks, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HarmonyReportData {
  archetype: string;
  summary: string;
  do: string[];
  dont: string[];
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

const HarmonyReport = ({ report }: { report: HarmonyReportData }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <Card className="mb-6">
        <CardHeader className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold">
              {report.archetype}
            </div>
            {report.user?.firstName && (
              <div className="text-muted-foreground">
                {report.user.firstName} {report.user.lastName}
              </div>
            )}
          </div>
          <CardTitle>My style in a nutshell</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">{report.summary}</CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <ListChecks className="w-5 h-5 text-success" />
            <CardTitle>How to work with me: DO</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.do.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <BadgeCheck className="w-4 h-4 text-success mt-1" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            <CardTitle>How to work with me: DON'T</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.dont.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-destructive mt-1" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HarmonyReport;
