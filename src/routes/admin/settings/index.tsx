import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getJsonFile, putJsonFile, ConflictError } from "@/lib/github/contentsApi";
import { dataRef } from "@/lib/data/repo";
import { settingsSchema, type Settings, type Teacher } from "@/schemas/settings";
import { QueryState } from "@/components/QueryState";

export const Route = createFileRoute("/admin/settings/")({
  component: SettingsScreen,
});

const SETTINGS_PATH = "settings.json";

function useSettingsWithSha() {
  return useQuery({
    queryKey: ["settings", "withSha"],
    queryFn: async () => {
      const result = await getJsonFile<Settings>(dataRef(), SETTINGS_PATH);
      if (!result) return null;
      return { data: settingsSchema.parse(result.data), sha: result.sha };
    },
  });
}

function emptyTeacher(): Teacher {
  return {
    id: crypto.randomUUID(),
    name: "",
    privateRate45: 0,
    privatePayroll: { scheme: "percent", value: 0 },
    groupPayroll: { scheme: "perLesson", value: 0 },
  };
}

function SettingsScreen() {
  const query = useSettingsWithSha();
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900">Настройки</h1>
      <QueryState query={query} loadingLabel="Загружаю настройки…">
        {(result) => <SettingsForm initial={result} />}
      </QueryState>
    </div>
  );
}

function SettingsForm({ initial }: { initial: { data: Settings; sha: string } | null }) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Settings>(
    initial?.data ?? {
      familyDiscount: 0.1,
      baseLessonMinutes: 45,
      currency: "ILS",
      teachers: [],
      halls: [],
      directions: [],
      levels: [],
      sources: [],
      otherCategories: [],
    },
  );
  const [sha, setSha] = useState<string | null>(initial?.sha ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedJustNow, setSavedJustNow] = useState(false);

  useEffect(() => {
    if (initial) {
      setSettings(initial.data);
      setSha(initial.sha);
    }
  }, [initial]);

  function updateList(key: keyof Pick<Settings, "halls" | "directions" | "levels" | "sources" | "otherCategories">, text: string) {
    setSettings((s) => ({
      ...s,
      [key]: text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    }));
  }

  function updateTeacher(id: string, patch: Partial<Teacher>) {
    setSettings((s) => ({ ...s, teachers: s.teachers.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  }

  function removeTeacher(id: string) {
    setSettings((s) => ({ ...s, teachers: s.teachers.filter((t) => t.id !== id) }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedJustNow(false);
    try {
      const parsed = settingsSchema.parse(settings);
      const result = await putJsonFile(dataRef(), SETTINGS_PATH, parsed, sha, "Обновлены настройки");
      setSha(result.sha);
      setSavedJustNow(true);
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (err) {
      if (err instanceof ConflictError) {
        setError("Настройки изменили в другом месте. Обновите страницу и повторите правки.");
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="mt-4 max-w-2xl space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-gray-900">Общее</h2>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label className="flex flex-col gap-1">
            Семейная скидка, %
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round(settings.familyDiscount * 100)}
              onChange={(e) => setSettings((s) => ({ ...s, familyDiscount: Number(e.target.value) / 100 }))}
              className="w-28 rounded border border-gray-300 px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col gap-1">
            Базовая длительность урока, мин
            <input
              type="number"
              min={1}
              value={settings.baseLessonMinutes}
              onChange={(e) => setSettings((s) => ({ ...s, baseLessonMinutes: Number(e.target.value) }))}
              className="w-28 rounded border border-gray-300 px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col gap-1">
            Валюта
            <input
              type="text"
              value={settings.currency}
              onChange={(e) => setSettings((s) => ({ ...s, currency: e.target.value }))}
              className="w-28 rounded border border-gray-300 px-2 py-1.5"
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-900">Педагоги</h2>
        <div className="mt-3 space-y-3">
          {settings.teachers.map((t) => (
            <div key={t.id} className="flex flex-wrap items-end gap-3 rounded border border-gray-200 p-3 text-sm">
              <label className="flex flex-col gap-1">
                Имя
                <input
                  type="text"
                  value={t.name}
                  onChange={(e) => updateTeacher(t.id, { name: e.target.value })}
                  className="w-40 rounded border border-gray-300 px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1">
                Ставка 45 мин ₪
                <input
                  type="number"
                  value={t.privateRate45}
                  onChange={(e) => updateTeacher(t.id, { privateRate45: Number(e.target.value) })}
                  className="w-24 rounded border border-gray-300 px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1">
                ЗП индивид.
                <select
                  value={t.privatePayroll.scheme}
                  onChange={(e) =>
                    updateTeacher(t.id, { privatePayroll: { ...t.privatePayroll, scheme: e.target.value as Teacher["privatePayroll"]["scheme"] } })
                  }
                  className="w-32 rounded border border-gray-300 px-2 py-1"
                >
                  <option value="percent">% от суммы</option>
                  <option value="perLesson">Фикс за занятие</option>
                  <option value="perHour">Фикс за час</option>
                </select>
              </label>
              <input
                type="number"
                step="0.01"
                value={t.privatePayroll.value}
                onChange={(e) => updateTeacher(t.id, { privatePayroll: { ...t.privatePayroll, value: Number(e.target.value) } })}
                className="w-20 rounded border border-gray-300 px-2 py-1"
              />
              <label className="flex flex-col gap-1">
                ЗП групповые
                <select
                  value={t.groupPayroll.scheme}
                  onChange={(e) =>
                    updateTeacher(t.id, { groupPayroll: { ...t.groupPayroll, scheme: e.target.value as Teacher["groupPayroll"]["scheme"] } })
                  }
                  className="w-32 rounded border border-gray-300 px-2 py-1"
                >
                  <option value="percent">% от суммы</option>
                  <option value="perLesson">Фикс за занятие</option>
                  <option value="perHour">Фикс за час</option>
                </select>
              </label>
              <input
                type="number"
                step="0.01"
                value={t.groupPayroll.value}
                onChange={(e) => updateTeacher(t.id, { groupPayroll: { ...t.groupPayroll, value: Number(e.target.value) } })}
                className="w-20 rounded border border-gray-300 px-2 py-1"
              />
              <button type="button" onClick={() => removeTeacher(t.id)} className="text-red-600 hover:underline">
                Удалить
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSettings((s) => ({ ...s, teachers: [...s.teachers, emptyTeacher()] }))}
            className="text-sm text-gray-600 hover:underline"
          >
            + Добавить педагога
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-900">Справочники</h2>
        <p className="mt-1 text-xs text-gray-500">По одному значению на строку.</p>
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
          {(
            [
              ["halls", "Залы"],
              ["directions", "Направления"],
              ["levels", "Уровни"],
              ["sources", "Источники"],
              ["otherCategories", "Категории «прочее»"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex flex-col gap-1">
              {label}
              <textarea
                rows={4}
                value={settings[key].join("\n")}
                onChange={(e) => updateList(key, e.target.value)}
                className="rounded border border-gray-300 px-2 py-1.5"
              />
            </label>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {savedJustNow && !error && <p className="text-sm text-green-700">Сохранено.</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Сохраняю…" : "Сохранить"}
      </button>
    </form>
  );
}
