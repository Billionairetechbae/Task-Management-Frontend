import { useCallback, useEffect, useState } from "react";
import { api, CustomFieldDefinition, CustomFieldEntityType, CustomFieldType } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

const types: CustomFieldType[] = ["text", "long_text", "number", "boolean", "date", "datetime", "single_select", "multi_select", "user", "url"];
const isSelect = (field: CustomFieldDefinition) => field.fieldType === "single_select" || field.fieldType === "multi_select";

export default function CustomFieldsManager() {
  const { workspaceRole, user } = useAuth();
  const [entity, setEntity] = useState<CustomFieldEntityType>("task");
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [name, setName] = useState(""); const [type, setType] = useState<CustomFieldType>("text"); const [error, setError] = useState("");
  const reload = useCallback(async () => { try { setDefinitions((await api.listCustomFields(entity, "all")).data.definitions); } catch { setDefinitions([]); } }, [entity]);
  useEffect(() => { reload(); }, [reload]);
  const create = async () => { try { await api.createCustomField({ entityType: entity, fieldType: type, name: name.trim() }); setName(""); setError(""); await reload(); } catch (e: any) { setError(e.message || "Could not create field"); } };
  const update = async (field: CustomFieldDefinition, patch: Record<string, unknown>) => {
    try {
      let confirmTightening = false;
      if (patch.config) {
        const preview = await api.previewCustomFieldConfig(field.id, patch.config as Record<string, any>);
        const count = preview.data.existingViolationCount;
        if (count && !window.confirm(`${count} existing values do not satisfy this new rule. They will not be changed automatically. Continue?`)) return;
        confirmTightening = count > 0;
      }
      await api.updateCustomField(field.id, { ...patch, ...(confirmTightening ? { confirmTightening: true } : {}) });
      setError(""); await reload();
    } catch (e: any) { setError(e.message || "Could not update field"); }
  };
  const edit = async (field: CustomFieldDefinition) => {
    const nextName = window.prompt("Field name", field.name); if (nextName === null) return;
    const description = window.prompt("Description / help text", field.description || ""); if (description === null) return;
    const rawConfig = window.prompt("Config as JSON", JSON.stringify(field.config || {})); if (rawConfig === null) return;
    const rawDefault = window.prompt("Default value as JSON (leave empty for no default)", field.defaultValue == null ? "" : JSON.stringify(field.defaultValue)); if (rawDefault === null) return;
    let config: Record<string, any>, defaultValue: unknown = null;
    try { config = JSON.parse(rawConfig); defaultValue = rawDefault.trim() ? JSON.parse(rawDefault) : null; }
    catch { setError("Config and default must be valid JSON"); return; }
    await update(field, { name: nextName.trim(), description: description.trim() || null, config, defaultValue });
  };
  const archiveOrRestore = async (field: CustomFieldDefinition) => {
    try { if (field.status === "active") await api.archiveCustomField(field.id); else await api.restoreCustomField(field.id); await reload(); }
    catch (e: any) { setError(e.message || "Could not update field"); }
  };
  const reorderField = async (index: number, delta: number) => {
    const active = definitions.filter(f => f.status === "active").sort((a, b) => a.position - b.position);
    const target = index + delta; if (target < 0 || target >= active.length) return;
    [active[index], active[target]] = [active[target], active[index]];
    await api.reorderCustomFields(entity, active.map(f => f.id)); await reload();
  };
  const addOption = async (field: CustomFieldDefinition) => {
    const label = window.prompt("Option label"); if (!label?.trim()) return;
    try { await api.addCustomFieldOption(field.id, { label: label.trim(), position: field.options?.length || 0 }); await reload(); }
    catch (e: any) { setError(e.message || "Could not add option"); }
  };
  const reorderOption = async (field: CustomFieldDefinition, index: number, delta: number) => {
    const options = [...(field.options || [])].filter(option => option.isActive).sort((a, b) => a.position - b.position);
    const target = index + delta; if (target < 0 || target >= options.length) return;
    [options[index], options[target]] = [options[target], options[index]];
    try { await api.reorderCustomFieldOptions(field.id, options.map(option => option.id)); await reload(); } catch (e: any) { setError(e.message || "Could not reorder options"); }
  };
  const changeOption = async (field: CustomFieldDefinition, option: NonNullable<CustomFieldDefinition["options"]>[number], action: "edit" | "archive" | "restore") => {
    try {
      if (action === "edit") { const label = window.prompt("Option label", option.label); if (label === null) return; const color = window.prompt("Color (optional)", option.color || ""); if (color === null) return; await api.updateCustomFieldOption(field.id, option.id, { label, color: color || null }); }
      if (action === "archive") await api.archiveCustomFieldOption(field.id, option.id);
      if (action === "restore") await api.restoreCustomFieldOption(field.id, option.id);
      await reload();
    } catch (e: any) { setError(e.message || "Could not update option"); }
  };
  const orderedActive = definitions.filter(f => f.status === "active").sort((a, b) => a.position - b.position);
  if (!(user?.role === "platform_admin" || ["owner", "admin", "manager"].includes(workspaceRole || ""))) return null;
  return <section className="rounded-lg border p-5 space-y-4">
    <div><h2 className="text-lg font-semibold">Custom fields</h2><p className="text-sm text-muted-foreground">Workspace fields for tasks and projects. Types and entity scope cannot be changed after creation.</p></div>
    <div className="flex gap-2"><Button variant={entity === "task" ? "default" : "outline"} onClick={() => setEntity("task")}>Task fields</Button><Button variant={entity === "project" ? "default" : "outline"} onClick={() => setEntity("project")}>Project fields</Button></div>
    <div className="flex gap-2"><Input aria-label="Field name" value={name} onChange={e => setName(e.target.value)} placeholder="Field name"/><select aria-label="Field type" value={type} onChange={e => setType(e.target.value as CustomFieldType)} className="rounded-md border bg-background px-2">{types.map(t => <option key={t} value={t}>{t}</option>)}</select><Button onClick={create} disabled={!name.trim() || orderedActive.length >= 30}>Add field</Button></div>
    {orderedActive.length >= 30 && <p className="text-xs text-muted-foreground">The 30 active field limit has been reached.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="divide-y">{definitions.map(field => <div key={field.id} className="py-3 space-y-2">
      <div className="flex items-center justify-between gap-2"><div><p className="font-medium">{field.name} <span className="text-xs text-muted-foreground">{field.fieldType}{field.status === "archived" ? " · archived" : ""}</span></p><p className="text-xs text-muted-foreground">{field.description || "No description"}</p></div><div className="flex flex-wrap gap-1">
        {field.status === "active" && <><Button size="sm" variant="outline" onClick={() => update(field, { isRequired: !field.isRequired })}>{field.isRequired ? "Required" : "Optional"}</Button><Button size="sm" variant="outline" onClick={() => edit(field)}>Edit</Button>{entity === "task" && ["single_select", "multi_select", "boolean", "number", "date", "user"].includes(field.fieldType) && <Button size="sm" variant="outline" onClick={() => update(field, { showOnBoard: !field.showOnBoard })}>{field.showOnBoard ? "On Board" : "Show on Board"}</Button>}</>}
        <Button size="sm" variant="outline" onClick={() => archiveOrRestore(field)}>{field.status === "active" ? "Archive" : "Restore"}</Button></div></div>
      {field.status === "active" && <div className="flex gap-1"><Button size="sm" variant="ghost" disabled={orderedActive.findIndex(f => f.id === field.id) === 0} onClick={() => reorderField(orderedActive.findIndex(f => f.id === field.id), -1)}>Move up</Button><Button size="sm" variant="ghost" disabled={orderedActive.findIndex(f => f.id === field.id) === orderedActive.length - 1} onClick={() => reorderField(orderedActive.findIndex(f => f.id === field.id), 1)}>Move down</Button></div>}
      {field.status === "active" && isSelect(field) && <div className="ml-3 border-l pl-3 space-y-1"><div className="flex items-center justify-between"><p className="text-xs font-medium">Options</p><Button size="sm" variant="outline" disabled={(field.options?.length || 0) >= 100} onClick={() => addOption(field)}>Add option</Button></div>{[...(field.options || [])].sort((a, b) => a.position - b.position).map(option => { const orderedActive = [...(field.options || [])].filter(o => o.isActive).sort((a, b) => a.position - b.position); const activeIndex = orderedActive.findIndex(o => o.id === option.id); return <div key={option.id} className="flex items-center gap-2 text-xs"><span className="h-2 w-2 rounded-full" style={{ background: option.color || "transparent" }} />{option.label}{!option.isActive && <span className="text-muted-foreground">(Archived)</span>}<span className="ml-auto flex gap-1">{option.isActive && <><Button size="sm" variant="ghost" disabled={activeIndex === 0} onClick={() => reorderOption(field, activeIndex, -1)}>↑</Button><Button size="sm" variant="ghost" disabled={activeIndex === orderedActive.length - 1} onClick={() => reorderOption(field, activeIndex, 1)}>↓</Button></>}<Button size="sm" variant="ghost" onClick={() => changeOption(field, option, "edit")}>Edit</Button>{option.isActive ? <Button size="sm" variant="ghost" onClick={() => changeOption(field, option, "archive")}>Archive</Button> : <Button size="sm" variant="ghost" onClick={() => changeOption(field, option, "restore")}>Restore</Button>}</span></div>; })}</div>}
    </div>)}</div>
  </section>;
}
