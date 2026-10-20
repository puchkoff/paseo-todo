import type { PluginTheme } from "@getpaseo/plugin";
import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { usePaseo, useRpc, useSettings } from "@getpaseo/plugin/client";
import { Modal, ScrollView, TextInput, useToast } from "@getpaseo/plugin/client/react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { type Item, type RangeFilter, type StatusFilter, type TodoDoc, addItem, addRun, autoPrompt, createdAt, filterItems, itemTitle, launchPrompt, removeItem, todoSettings, updateItem } from "../shared/todo.ts";

const FS = { title: 27, body: 18, small: 16 };
const PROVIDER = "claude/claude-opus-5-5";
const MODE = "bypassPermissions"; // same as the other agents; the default mode asks for every command
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function Btn({ theme, label, tone = "plain", disabled, onPress }: { theme: PluginTheme; label: string; tone?: "pri" | "bad" | "plain"; disabled?: boolean; onPress: () => void }) {
  const c = theme.colors;
  const bg = { pri: c.accent, bad: c.statusDanger, plain: c.surface2 }[tone];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: bg, opacity: disabled ? 0.5 : 1 }}>
      <Text style={{ color: tone === "plain" ? c.foreground : c.accentForeground, fontSize: FS.small }}>{label}</Text>
    </Pressable>
  );
}

function Chips<T extends string>({ theme, value, options, onChange }: { theme: PluginTheme; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  const c = theme.colors;
  return (
    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
      {options.map(([v, label]) => (
        <Pressable key={v} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: v === value }} onPress={() => onChange(v)}
          style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: v === value ? c.accent : c.surface2 }}>
          <Text style={{ color: v === value ? c.accentForeground : c.foreground, fontSize: FS.small }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

interface CardProps {
  theme: PluginTheme;
  item: Pick<Item, "title" | "todo" | "prompt" | "launchedAt" | "doneAt"> & { runs?: Item["runs"] };
  saveLabel: string;
  onSave: (title: string, todo: string, prompt: string) => Promise<boolean>;
  onRun?: () => void;
  onOpenAgent?: (agentId: string) => void;
  onToggleDone?: () => void;
  onDelete?: () => void;
}

// Draft state is local; the saved document only changes on Save.
function Card({ theme, item, saveLabel, onSave, onRun, onOpenAgent, onToggleDone, onDelete }: CardProps) {
  const c = theme.colors;
  const toast = useToast();
  const generate = useRpc(autoPrompt);
  const [title, setTitle] = useState(item.title);
  const [todo, setTodo] = useState(item.todo);
  const [prompt, setPrompt] = useState(item.prompt);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setTitle(item.title); setTodo(item.todo); setPrompt(item.prompt); }, [item.title, item.todo, item.prompt]);
  const dirty = title !== item.title || todo !== item.todo || prompt !== item.prompt;
  const hasText = !!(title.trim() || todo.trim());
  const field = { color: c.foreground, backgroundColor: c.surface2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: FS.body };

  async function auto() {
    setBusy(true);
    try {
      setPrompt((await generate({ todo: [title.trim(), todo.trim()].filter(Boolean).join("\n\n") })).prompt);
    } catch (e) {
      toast.error(`Auto-prompt failed: ${msg(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    await onSave(title.trim(), todo.trim(), prompt);
  }

  return (
    <View style={{ gap: 8, padding: 12, borderRadius: 10, backgroundColor: c.surface1 }}>
      <TextInput value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={c.foregroundMuted} style={{ ...field, fontWeight: "600" }} />
      <TextInput value={todo} onChangeText={setTodo} placeholder="Todo" placeholderTextColor={c.foregroundMuted} multiline
        style={{ ...field, minHeight: 110, textAlignVertical: "top" }} />
      <TextInput value={prompt} onChangeText={setPrompt} placeholder="Prompt for the agent" placeholderTextColor={c.foregroundMuted} multiline
        style={{ ...field, minHeight: 360, textAlignVertical: "top" }} />
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Btn theme={theme} label={busy ? "Writing…" : "Auto-prompt"} disabled={busy || !hasText} onPress={() => void auto()} />
        {dirty ? <Btn theme={theme} tone="pri" label={saveLabel} disabled={!hasText} onPress={() => void save()} /> : null}
        {onRun ? <Btn theme={theme} tone="pri" label="Run" disabled={dirty} onPress={onRun} /> : null}
        {onToggleDone ? <Btn theme={theme} label={item.doneAt ? "Reopen" : "Mark done"} disabled={dirty} onPress={onToggleDone} /> : null}
        {item.launchedAt ? <Text style={{ color: c.foregroundMuted, fontSize: FS.small }}>launched {new Date(item.launchedAt).toLocaleString()}</Text> : null}
        {onDelete ? <View style={{ marginLeft: "auto" }}><Btn theme={theme} tone="bad" label="Delete" onPress={onDelete} /></View> : null}
      </View>
      {!!item.runs?.length && onOpenAgent ?  (
        <View style={{ gap: 6 }}>
          <Text style={{ color: c.foregroundMuted, fontSize: FS.small }}>Agents run on this task</Text>
          {[...item.runs].reverse().map((r) => (
            <View key={r.agentId} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ color: c.foreground, fontSize: FS.small, flex: 1 }}>{new Date(r.at).toLocaleString()}</Text>
              <Btn theme={theme} label="Open agent" onPress={() => onOpenAgent(r.agentId)} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

interface Project { id: string; name: string; path: string }

// Projects of the selected host (one per root path), loaded once when the picker opens.
function useProjects(open: boolean): { list: Project[]; error: string | null } {
  const paseo = usePaseo();
  const [state, setState] = useState<{ list: Project[]; error: string | null }>({ list: [], error: null });
  useEffect(() => {
    if (!open) return;
    paseo.workspaces.list().then(
      ({ entries }) => {
        const byId = new Map<string, Project>();
        for (const w of entries) if (!w.archivingAt) byId.set(w.projectId, { id: w.projectId, name: w.projectDisplayName, path: w.projectRootPath });
        setState({ list: [...byId.values()].sort((a, b) => a.name.localeCompare(b.name)), error: null });
      },
      (e) => setState({ list: [], error: msg(e) }),
    );
  }, [paseo, open]);
  return state;
}

export function TodoScreen({ theme, host, layout, navigation }: PluginScreenProps) {
  const c = theme.colors;
  const settings = useSettings(todoSettings);
  const paseo = usePaseo();
  const toast = useToast();
  const [running, setRunning] = useState<Item | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [range, setRange] = useState<RangeFilter>("any");
  const [open, setOpen] = useState<string | null>(null); // item id, "new", or null for the list
  const { list, error } = useProjects(running !== null);

  if (settings.status === "loading") return <Text style={{ color: c.foregroundMuted, fontSize: FS.body, padding: 24 }}>Loading…</Text>;
  if (settings.status !== "ready") {
    return <Text style={{ color: c.statusDanger, fontSize: FS.body, padding: 24 }}>Todo is unavailable on {host.label}: {settings.status === "error" || settings.status === "invalid" ? settings.error : ""}</Text>;
  }

  async function change(fn: (d: TodoDoc) => TodoDoc): Promise<boolean> {
    if (settings.status !== "ready") return false;
    const ok = await settings.save(fn(settings.values), settings.revision);
    if (!ok) toast.error("Could not save. The list changed elsewhere; try again.");
    return ok;
  }

  async function run(item: Item, project: Project) {
    setRunning(null);
    try {
      // A fresh workspace per run; directory source works for git and non-git projects alike.
      const workspace = await paseo.workspaces.create({ source: { kind: "directory", path: project.path }, title: itemTitle(item) });
      const agent = await workspace.agents.create({
        config: { provider: PROVIDER, modeId: MODE },
        prompt: launchPrompt(item),
        });
      await change((d) => addRun(d, item.id, agent.id, Date.now()));
      navigation?.openAgent({ agentId: agent.id, serverId: host.id });
    } catch (e) {
      toast.error(`Could not start the agent: ${msg(e)}`);
    }
  }

  const doc: TodoDoc = settings.values;
  const toggleDone = (i: Item) => change((d) => updateItem(d, i.id, { doneAt: i.doneAt ? undefined : Date.now() }));
  const shown = filterItems(doc.items, status, range, Date.now());
  const current = open && open !== "new" ? doc.items.find((i) => i.id === open) : undefined;
  const list_ = (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ color: c.foreground, fontSize: FS.title, fontWeight: "600", flex: 1 }}>
          Todo <Text style={{ color: c.foregroundMuted, fontSize: FS.small, fontWeight: "400" }}>{host.label}</Text>
        </Text>
        <Btn theme={theme} tone="pri" label="New task" onPress={() => setOpen("new")} />
      </View>
      <Chips theme={theme} value={status} onChange={setStatus} options={[["all", "All"], ["open", "Open"], ["done", "Done"]]} />
      <Chips theme={theme} value={range} onChange={setRange} options={[["any", "Any time"], ["today", "Today"], ["week", "7 days"], ["month", "30 days"]]} />
      {shown.map((i) => (
        <View key={i.id} style={{ flexDirection: "row", gap: 6, alignItems: "center", borderRadius: 10, backgroundColor: c.surface1 }}>
          <Pressable accessibilityRole="checkbox" accessibilityLabel={i.doneAt ? `Reopen ${itemTitle(i)}` : `Mark ${itemTitle(i)} done`} accessibilityState={{ checked: !!i.doneAt }} onPress={() => void toggleDone(i)}
            style={{ padding: 14 }}>
            <Text style={{ color: i.doneAt ? c.statusSuccess : c.foregroundMuted, fontSize: FS.body + 4 }}>{i.doneAt ? "☑" : "☐"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Open ${itemTitle(i)}`} onPress={() => setOpen(i.id)}
            style={{ flex: 1, flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 14, paddingRight: 14 }}>
            <Text style={{ color: i.doneAt ? c.foregroundMuted : c.foreground, fontSize: FS.body, flex: 1, textDecorationLine: i.doneAt ? "line-through" : "none" }} numberOfLines={1}>{itemTitle(i)}</Text>
            {i.launchedAt ? <Text style={{ color: c.foregroundMuted, fontSize: FS.small }}>launched</Text> : null}
            <Text style={{ color: c.foregroundMuted, fontSize: FS.small }}>{new Date(createdAt(i)).toLocaleDateString()}</Text>
          </Pressable>
        </View>
      ))}
      {shown.length === 0 ? <Text style={{ color: c.foregroundMuted, textAlign: "center", fontSize: FS.body, paddingVertical: 30 }}>{doc.items.length === 0 ? "Nothing parked yet." : "No tasks match the filters."}</Text> : null}
    </>
  );
  const card = open === "new" ? (
    <Card theme={theme} item={{ title: "", todo: "", prompt: "" }} saveLabel="Add"
      onSave={async (title, todo, prompt) => { const ok = await change((d) => addItem(d, { id: newId(), title, todo, prompt, runs: [] })); if (ok) setOpen(null); return ok; }} />
  ) : current ? (
    <Card theme={theme} item={current} saveLabel="Save"
      onSave={(title, todo, prompt) => change((d) => updateItem(d, current.id, { title, todo, prompt }))}
      onRun={() => setRunning(current)} onOpenAgent={(agentId) => navigation?.openAgent({ agentId, serverId: host.id })} onToggleDone={() => void toggleDone(current)} onDelete={() => void change((d) => removeItem(d, current.id)).then((ok) => ok && setOpen(null))} />
  ) : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.surface0 }} contentContainerStyle={{ padding: layout.compact ? 16 : 24, gap: 12, maxWidth: 860, width: "100%", alignSelf: "center" }}>
      {card ? (
        <>
          <View style={{ flexDirection: "row" }}><Btn theme={theme} label="← Tasks" onPress={() => setOpen(null)} /></View>
          {card}
        </>
      ) : list_}

      <Modal title="Run in a new workspace of…" open={running !== null} onOpenChange={(o) => !o && setRunning(null)}>
        <Modal.Content>
          <View style={{ gap: 6 }}>
            {error ? <Text style={{ color: c.statusDanger, fontSize: FS.small }}>{error}</Text> : null}
            {list.map((w) => (
              <Pressable key={w.id} accessibilityRole="button" accessibilityLabel={`Run in a new workspace of ${w.name}`} onPress={() => running && void run(running, w)}
                style={{ paddingVertical: 11, paddingHorizontal: 12, borderRadius: 8, backgroundColor: c.surface2 }}>
                <Text style={{ color: c.foreground, fontSize: FS.body }}>{w.name} <Text style={{ color: c.foregroundMuted, fontSize: FS.small }}>{w.path}</Text></Text>
              </Pressable>
            ))}
          </View>
        </Modal.Content>
      </Modal>
    </ScrollView>
  );
}
