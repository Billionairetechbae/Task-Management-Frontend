import { useEffect, useState } from "react";
import { api, CustomFieldDefinition, CustomFieldEntityType } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = { entityType: CustomFieldEntityType; entityId?: string; value?: Record<string, unknown>; onChange?: (value: Record<string, unknown>) => void; templateSafeOnly?: boolean; definitionsOverride?: CustomFieldDefinition[] };
export default function CustomFieldsForm({ entityType, entityId, value, onChange, templateSafeOnly = false, definitionsOverride }: Props) {
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [internal, setInternal] = useState<Record<string, unknown>>({});
  const values = value ?? internal;
  const update = (id: string, next: unknown) => {
    const changed = { ...values, [id]: next };
    if (onChange) onChange(changed); else setInternal(changed);
  };
  useEffect(() => {
    let alive = true;
    if (definitionsOverride) {
      setDefinitions(definitionsOverride.filter((field) => field.status === "active" && (!templateSafeOnly || !["datetime", "user"].includes(field.fieldType))));
      return () => { alive = false; };
    }
    api.listCustomFields(entityType).then((res) => {
      if (!alive) return;
      const active = res.data.definitions.filter((field) => field.status === "active" && (!templateSafeOnly || !["datetime", "user"].includes(field.fieldType))); setDefinitions(active);
      if (active.some(field => field.fieldType === "user")) api.getCompanyTeam().then((team: any) => { if (!alive) return; const rows = team?.data?.members || team?.data?.team_members || []; setMembers(rows.filter((m: any) => m.status !== "removed" && m.user?.id).map((m: any) => ({ id: m.user.id, name: `${m.user.firstName || ""} ${m.user.lastName || ""}`.trim() || m.user.email || m.user.id }))); }).catch(() => undefined);
    }).catch(() => alive && setDefinitions([]));
    if (entityId) api[entityType === "task" ? "getTaskCustomFields" : "getProjectCustomFields"](entityId)
      .then((res) => { if (!alive) return; const loaded = Object.fromEntries(res.data.values.map((row) => [row.fieldId, row.value])); setInternal(loaded); onChange?.(loaded); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [entityType, entityId, templateSafeOnly, definitionsOverride]);
  if (!definitions.length) return null;
  const control = (field: CustomFieldDefinition) => {
    const current = values[field.id] ?? "";
    const options = field.options?.filter((option) => option.isActive) ?? [];
    if (field.fieldType === "boolean") return <input aria-label={field.name} type="checkbox" checked={current === true} onChange={(e) => update(field.id, e.target.checked)} />;
    if (field.fieldType === "long_text") return <Textarea aria-label={field.name} maxLength={5000} value={String(current)} onChange={(e) => update(field.id, e.target.value)} />;
    if (field.fieldType === "single_select" || field.fieldType === "multi_select") return <select aria-label={field.name} multiple={field.fieldType === "multi_select"} className="w-full rounded-md border bg-background px-3 py-2" value={field.fieldType === "multi_select" ? (Array.isArray(current) ? current.map(String) : []) : String(current)} onChange={(e) => update(field.id, field.fieldType === "multi_select" ? Array.from(e.currentTarget.selectedOptions, (o) => o.value) : e.target.value)}>{field.fieldType === "single_select" && <option value="">Choose…</option>}{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>;
    if (field.fieldType === "user") return <select aria-label={field.name} className="w-full rounded-md border bg-background px-3 py-2" value={String(current)} onChange={(e) => update(field.id, e.target.value || null)}><option value="">Choose a workspace member…</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select>;
    const type = field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : field.fieldType === "datetime" ? "datetime-local" : field.fieldType === "url" ? "url" : "text";
    const shown = field.fieldType === "datetime" && current ? new Date(String(current)).toISOString().slice(0, 16) : String(current);
    return <Input aria-label={field.name} type={type} maxLength={field.fieldType === "text" ? Number(field.config?.maxLength ?? 500) : undefined} value={shown} onChange={(e) => update(field.id, field.fieldType === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : field.fieldType === "datetime" && e.target.value ? new Date(e.target.value).toISOString() : e.target.value)} />;
  };
  return <section className="space-y-3" aria-label="Custom fields"><h3 className="text-sm font-medium">Custom fields</h3>{definitions.map((field) => <div key={field.id} className="space-y-1"><Label>{field.name}{field.isRequired ? " *" : ""}</Label>{control(field)}{field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}</div>)}</section>;
}
