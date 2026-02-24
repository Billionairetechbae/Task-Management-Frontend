import { Badge } from "@/components/ui/badge";

type Company = {
  id: string;
  name: string;
  companyCode?: string;
  industry?: string;
};

export default function CompanyBadge({ company }: { company?: Company }) {
  if (!company) return null;
  return (
    <Badge variant="outline" className="gap-1">
      <span>{company.name}</span>
      {company.companyCode ? (
        <span className="text-[10px] uppercase text-muted-foreground">({company.companyCode})</span>
      ) : null}
    </Badge>
  );
}

