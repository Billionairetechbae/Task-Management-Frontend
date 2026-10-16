import { useState } from "react";
import { api, CustomFieldValue } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
type Props = { entityType: "task" | "project"; entityId: string; limit?: number };
export default function CustomFieldValueDisplay({ entityType, entityId, limit = 20 }: Props) {
  const [showArchived, setShowArchived] = useState(false);
  const { workspaceRole } = useAuth();
  const manager = ["owner", "admin", "manager"].includes(workspaceRole || "");
  const query = useQuery({ queryKey: ["task-custom-fields", entityType, entityId], queryFn: async () => (entityType === "task" ? api.getTaskCustomFields(entityId) : api.getProjectCustomFields(entityId)).then(res => res.data), enabled: Boolean(entityId), retry: false });
  const values = query.data?.values || [];
  const archived = query.data?.archivedValues || [];
  const missing = query.data?.missingRequired || [];
  if (!values.length && !missing.length && !archived.length) return null;
  const label = (row: CustomFieldValue) => {
    const value = row.value;
    if (["single_select", "multi_select"].includes(row.field.fieldType)) {
      const ids = Array.isArray(value) ? value : [value];
      return ids.map(id => { const option = row.field.options?.find(o => o.id === id); return option ? `${option.isActive ? "" : "(Archived) "}${option.label}` : "(Archived) Unknown option"; }).join(", ");
    }
    if (row.field.fieldType === "boolean") return value ? "Yes" : "No";
    if (row.field.fieldType === "long_text") return String(value);
    if (row.field.fieldType === "datetime") return new Date(String(value)).toLocaleString();
    return String(value);
  };
  return <section className="space-y-2" aria-label="Custom fields"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Custom fields</h3>{manager && <Link className="text-xs text-muted-foreground underline" to="/company-profile">Manage custom fields</Link>}</div>{missing.map(field => <p key={field.fieldId} className="text-xs text-amber-700">Required field missing: {field.name}</p>)}<dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">{values.slice(0, limit).map(row => <div key={row.id} className="rounded-md border p-3"><dt className="text-xs text-muted-foreground">{row.field.name}{row.field.isRequired ? " · required" : ""}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{label(row)}</dd></div>)}</dl>{manager && archived.length > 0 && <div><button type="button" className="text-xs text-muted-foreground underline" aria-expanded={showArchived} onClick={() => setShowArchived(v => !v)}>Archived custom field values ({archived.length})</button>{showArchived && <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">{archived.slice(0, limit).map(row => <div key={row.id} className="rounded-md border border-dashed p-3"><dt className="text-xs text-muted-foreground">(Archived) {row.field.name}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{label(row)}</dd></div>)}</dl>}</div>}</section>;
}
