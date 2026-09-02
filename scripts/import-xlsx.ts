/**
 * Перенос данных из Excel-версии CRM в JSON (ТЗ §1, Фаза 1).
 *
 * Usage:
 *   npm run import:xlsx [путь/к/файлу.xlsx]              — пишет JSON в ./import-output (гитигнорится)
 *   npm run import:xlsx:upload [путь/к/файлу.xlsx]        — то же, плюс заливает в etude-crm-data
 *
 * Строки с "ПРИМЕР" в колонке примечаний/комментариев пропускаются — это
 * образцы для удаления, не реальные данные (см. сам файл ETUDE_CRM.xlsx).
 */

import ExcelJS from "exceljs";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { settingsSchema, type Settings, type Teacher } from "../src/schemas/settings";
import { clientSchema, type Client } from "../src/schemas/client";
import { studentSchema, type Student } from "../src/schemas/student";
import { groupSchema, type Group } from "../src/schemas/group";
import { enrollmentSchema, type Enrollment } from "../src/schemas/enrollment";
import { getJsonFile, putJsonFile } from "../src/lib/github/contentsApi";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../import-output");

// ---------------------------------------------------------------------------
// .env.local (for --upload only; import:xlsx without --upload needs none of this)
// ---------------------------------------------------------------------------

function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

// ---------------------------------------------------------------------------
// Excel reading helpers
// ---------------------------------------------------------------------------

function cellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v && typeof v === "object") {
    if ("result" in v) return (v as { result: unknown }).result;
    if ("richText" in v) return (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("");
    if ("text" in v) return (v as { text: unknown }).text;
  }
  return v;
}

function readSheet(wb: ExcelJS.Workbook, name: string, headerRow: number) {
  const ws = wb.getWorksheet(name);
  if (!ws) throw new Error(`Лист "${name}" не найден в файле.`);
  const headerCells = ws.getRow(headerRow);
  const headers = new Map<string, number>();
  headerCells.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const text = cellValue(cell);
    if (typeof text === "string" && text.trim()) headers.set(text.trim(), colNumber);
  });
  const dataRows: ExcelJS.Row[] = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) dataRows.push(ws.getRow(r));
  return { ws, headers, dataRows };
}

function col(headers: Map<string, number>, name: string): number {
  const idx = headers.get(name);
  if (idx === undefined) throw new Error(`Колонка "${name}" не найдена.`);
  return idx;
}

function get(row: ExcelJS.Row, headers: Map<string, number>, name: string): unknown {
  return cellValue(row.getCell(col(headers, name)));
}

function assertHeader(headerRow: ExcelJS.Row, colNumber: number, expected: string): void {
  const actual = cellValue(headerRow.getCell(colNumber));
  if (actual !== expected) {
    throw new Error(
      `Лист "Настройки": ожидал колонку "${expected}" в позиции ${colNumber}, нашёл "${String(actual)}". ` +
        `Структура листа изменилась — обновите scripts/import-xlsx.ts.`,
    );
  }
}

function isExampleRow(value: unknown): boolean {
  return typeof value === "string" && value.toUpperCase().includes("ПРИМЕР");
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function toDateString(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  throw new Error(`Ожидалась дата, получено: ${JSON.stringify(value)}`);
}

function toTimeString(value: unknown): string {
  if (value instanceof Date) {
    const h = String(value.getUTCHours()).padStart(2, "0");
    const m = String(value.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    const h = String(Math.floor(totalMinutes / 60) % 24).padStart(2, "0");
    const m = String(totalMinutes % 60).padStart(2, "0");
    return `${h}:${m}`;
  }
  throw new Error(`Ожидалось время, получено: ${JSON.stringify(value)}`);
}

function toBool(value: unknown): boolean {
  if (value === "Да") return true;
  if (value === "Нет") return false;
  console.warn(`  ⚠ неожиданное значение да/нет: ${JSON.stringify(value)} — считаю "нет"`);
  return false;
}

// ---------------------------------------------------------------------------
// Label -> internal enum maps (Настройки — справочники)
// ---------------------------------------------------------------------------

const SCHEME_LABELS: Record<string, Teacher["privatePayroll"]["scheme"]> = {
  "% от суммы": "percent",
  "Фикс за занятие": "perLesson",
  "Фикс за час": "perHour",
};
function mapScheme(label: unknown): Teacher["privatePayroll"]["scheme"] {
  const scheme = SCHEME_LABELS[str(label)];
  if (!scheme) throw new Error(`Неизвестная схема ЗП: "${String(label)}"`);
  return scheme;
}

const CLIENT_TYPE_LABELS: Record<string, Client["type"]> = { Родитель: "parent", "Сам ученик": "self" };
const CLIENT_STATUS_LABELS: Record<string, Client["status"]> = { Активен: "active", Пауза: "paused", Ушёл: "left" };
const STUDENT_STATUS_LABELS: Record<string, Student["status"]> = {
  Пробный: "trial",
  Активен: "active",
  Пауза: "paused",
  Ушёл: "left",
};
const SEX_LABELS: Record<string, Student["sex"]> = { М: "M", Ж: "F" };
const BILLING_LABELS: Record<string, Group["billing"]> = { "Фикс за месяц": "monthly", "За занятие": "perLesson" };
const WEEKDAY_LABELS: Record<string, Group["days"][number]> = {
  Пн: "Mon",
  Вт: "Tue",
  Ср: "Wed",
  Чт: "Thu",
  Пт: "Fri",
  Сб: "Sat",
  Вс: "Sun",
};

function mapLabel<T extends string>(map: Record<string, T>, value: unknown, what: string): T {
  const key = str(value);
  const mapped = map[key];
  if (!mapped) throw new Error(`Неизвестное значение "${what}": "${key}"`);
  return mapped;
}

function parseWeekdays(value: unknown): Group["days"] {
  return str(value)
    .split("/")
    .map((part) => mapLabel(WEEKDAY_LABELS, part.trim(), "День недели"));
}

// ---------------------------------------------------------------------------
// Sheet -> entity builders
// ---------------------------------------------------------------------------

function buildSettings(wb: ExcelJS.Workbook): { settings: Settings; teacherIdByName: Map<string, string> } {
  const { ws, headers } = readSheet(wb, "Настройки", 4);
  const headerRow = ws.getRow(4);
  const maxRow = ws.rowCount;

  // Duplicate "Значение" header appears twice for teachers + once more for params —
  // the generic name->index map can't disambiguate, so this block is column-position-based.
  const TEACHER_COL = { name: 18, rate: 19, privScheme: 20, privValue: 21, groupScheme: 22, groupValue: 23, comment: 24 };
  const PARAM_COL = { key: 26, value: 27 };
  assertHeader(headerRow, TEACHER_COL.name, "Педагог");
  assertHeader(headerRow, TEACHER_COL.rate, "Ставка за 45 мин ₪");
  assertHeader(headerRow, TEACHER_COL.privScheme, "Схема ЗП индивид.");
  assertHeader(headerRow, TEACHER_COL.privValue, "Значение");
  assertHeader(headerRow, TEACHER_COL.groupScheme, "Схема ЗП групповые");
  assertHeader(headerRow, TEACHER_COL.groupValue, "Значение");
  assertHeader(headerRow, TEACHER_COL.comment, "Комментарий");
  assertHeader(headerRow, PARAM_COL.key, "Параметр");
  assertHeader(headerRow, PARAM_COL.value, "Значение");

  const teachers: Teacher[] = [];
  const teacherIdByName = new Map<string, string>();
  for (let r = 5; r <= maxRow; r++) {
    const name = cellValue(ws.getCell(r, TEACHER_COL.name));
    if (typeof name !== "string" || !name.trim()) continue;
    // Below the real table (row ~8+) a footnote spills into this column at some row —
    // a numeric rate is what actually distinguishes a teacher row from stray text.
    const rate = cellValue(ws.getCell(r, TEACHER_COL.rate));
    if (typeof rate !== "number") continue;
    if (isExampleRow(cellValue(ws.getCell(r, TEACHER_COL.comment)))) continue;

    const id = `T-${String(teachers.length + 1).padStart(2, "0")}`;
    teachers.push({
      id,
      name: name.trim(),
      privateRate45: rate,
      privatePayroll: {
        scheme: mapScheme(cellValue(ws.getCell(r, TEACHER_COL.privScheme))),
        value: Number(cellValue(ws.getCell(r, TEACHER_COL.privValue))),
      },
      groupPayroll: {
        scheme: mapScheme(cellValue(ws.getCell(r, TEACHER_COL.groupScheme))),
        value: Number(cellValue(ws.getCell(r, TEACHER_COL.groupValue))),
      },
    });
    teacherIdByName.set(name.trim(), id);
  }

  function listColumn(name: string): string[] {
    const idx = headers.get(name);
    if (idx === undefined) return [];
    const out: string[] = [];
    for (let r = 5; r <= maxRow; r++) {
      const v = cellValue(ws.getCell(r, idx));
      if (typeof v === "string" && v.trim()) out.push(v.trim());
    }
    return out;
  }

  const params = new Map<string, unknown>();
  for (let r = 5; r <= maxRow; r++) {
    const key = cellValue(ws.getCell(r, PARAM_COL.key));
    if (typeof key === "string" && key.trim()) params.set(key.trim(), cellValue(ws.getCell(r, PARAM_COL.value)));
  }

  const settings: Settings = {
    familyDiscount: Number(params.get("Семейная скидка со 2-го ребёнка") ?? 0.1),
    baseLessonMinutes: Number(params.get("Базовая длительность урока, мин") ?? 45),
    // Не хранится в листе "Настройки" — студия работает в шекелях (везде ₪ в шаблоне).
    currency: "ILS",
    teachers,
    halls: listColumn("Зал"),
    directions: listColumn("Направление"),
    levels: listColumn("Уровень"),
    sources: listColumn("Источник"),
    otherCategories: listColumn("Категория «прочее»"),
  };

  return { settings: settingsSchema.parse(settings), teacherIdByName };
}

function buildClients(wb: ExcelJS.Workbook): Client[] {
  const { headers, dataRows } = readSheet(wb, "Клиенты", 4);
  const clients: Client[] = [];
  for (const row of dataRows) {
    const id = get(row, headers, "Клиент ID");
    if (typeof id !== "string" || !id.trim()) continue;
    const notes = get(row, headers, "Примечания");
    if (isExampleRow(notes)) continue;

    clients.push(
      clientSchema.parse({
        id: id.trim(),
        name: str(get(row, headers, "ФИО клиента")),
        phone: str(get(row, headers, "Телефон")),
        email: str(get(row, headers, "Email")),
        type: mapLabel(CLIENT_TYPE_LABELS, get(row, headers, "Тип клиента"), "Тип клиента"),
        status: mapLabel(CLIENT_STATUS_LABELS, get(row, headers, "Статус"), "Статус клиента"),
        specialDiscount: Number(get(row, headers, "Спецскидка %") ?? 0),
        source: str(get(row, headers, "Источник")),
        registeredAt: toDateString(get(row, headers, "Дата регистрации")),
        notes: str(notes),
      }),
    );
  }
  return clients;
}

function buildStudents(wb: ExcelJS.Workbook): Student[] {
  const { headers, dataRows } = readSheet(wb, "Ученики", 4);

  interface Raw {
    id: string;
    name: string;
    clientId: string;
    birthDate: string;
    sex: Student["sex"];
    partnerName: string;
    startedAt: string;
    status: Student["status"];
    specialDiscount: number;
    healthDeclaration: boolean;
    photoConsent: boolean;
    notes: string;
  }

  const raw: Raw[] = [];
  for (const row of dataRows) {
    const id = get(row, headers, "ID ученика");
    if (typeof id !== "string" || !id.trim()) continue;
    const notes = get(row, headers, "Примечания");
    if (isExampleRow(notes)) continue;

    raw.push({
      id: id.trim(),
      name: str(get(row, headers, "ФИО ученика")),
      clientId: str(get(row, headers, "Клиент ID")),
      birthDate: toDateString(get(row, headers, "Дата рождения")),
      sex: mapLabel(SEX_LABELS, get(row, headers, "Пол"), "Пол"),
      partnerName: str(get(row, headers, "Партнёр")),
      startedAt: toDateString(get(row, headers, "Начало занятий")),
      status: mapLabel(STUDENT_STATUS_LABELS, get(row, headers, "Статус"), "Статус ученика"),
      specialDiscount: Number(get(row, headers, "Спецскидка ученика %") ?? 0),
      healthDeclaration: toBool(get(row, headers, "Декларация здоровья")),
      photoConsent: toBool(get(row, headers, "Согласие фото")),
      notes: str(notes),
    });
  }

  const idByName = new Map<string, string>();
  const duplicateNames = new Set<string>();
  for (const s of raw) {
    if (idByName.has(s.name)) duplicateNames.add(s.name);
    idByName.set(s.name, s.id);
  }

  return raw.map((s) => {
    let partnerId: string | null = null;
    if (s.partnerName) {
      if (duplicateNames.has(s.partnerName)) {
        throw new Error(
          `Ученик "${s.name}": партнёр "${s.partnerName}" — имя не уникально среди учеников, ` +
            `не могу определить, кого именно вы имели в виду. Уточните имя в листе "Ученики".`,
        );
      }
      const resolved = idByName.get(s.partnerName);
      if (!resolved) throw new Error(`Ученик "${s.name}": партнёр "${s.partnerName}" не найден среди учеников.`);
      partnerId = resolved;
    }
    return studentSchema.parse({ ...s, partnerId });
  });
}

function buildGroups(
  wb: ExcelJS.Workbook,
  teacherIdByName: Map<string, string>,
): { groups: Group[]; idByName: Map<string, string> } {
  const { headers, dataRows } = readSheet(wb, "Группы", 4);
  const groups: Group[] = [];
  const idByName = new Map<string, string>();

  for (const row of dataRows) {
    const id = get(row, headers, "Код");
    if (typeof id !== "string" || !id.trim()) continue;
    if (isExampleRow(get(row, headers, "Примечание"))) continue;

    const name = str(get(row, headers, "Название группы"));
    const teacherName = str(get(row, headers, "Педагог"));
    const teacherId = teacherIdByName.get(teacherName);
    if (!teacherId) throw new Error(`Группа "${name}": педагог "${teacherName}" не найден в листе "Настройки".`);

    const group = groupSchema.parse({
      id: id.trim(),
      name,
      direction: str(get(row, headers, "Направление")),
      level: str(get(row, headers, "Уровень")),
      teacherId,
      days: parseWeekdays(get(row, headers, "День недели")),
      startTime: toTimeString(get(row, headers, "Начало")),
      endTime: toTimeString(get(row, headers, "Конец")),
      hall: str(get(row, headers, "Зал")),
      capacity: Number(get(row, headers, "Вместимость") ?? 0),
      billing: mapLabel(BILLING_LABELS, get(row, headers, "Схема оплаты"), "Схема оплаты группы"),
      monthlyPrice: Number(get(row, headers, "Цена месяца ₪") ?? 0),
      lessonPrice: Number(get(row, headers, "Цена занятия ₪") ?? 0),
      // Нет колонки-источника в шаблоне — все импортированные группы считаются активными.
      active: true,
    });
    groups.push(group);
    idByName.set(name, group.id);
  }
  return { groups, idByName };
}

function buildEnrollments(wb: ExcelJS.Workbook, groupIdByName: Map<string, string>): Enrollment[] {
  const { headers, dataRows } = readSheet(wb, "Записи в группы", 4);
  const enrollments: Enrollment[] = [];

  for (const row of dataRows) {
    const id = get(row, headers, "Запись ID");
    if (typeof id !== "string" || !id.trim()) continue;
    if (isExampleRow(get(row, headers, "Примечание"))) continue;

    const groupName = str(get(row, headers, "Группа"));
    const groupId = groupIdByName.get(groupName);
    if (!groupId) throw new Error(`Запись "${id}": группа "${groupName}" не найдена в листе "Группы".`);

    const endedAtRaw = get(row, headers, "Дата окончания");
    enrollments.push(
      enrollmentSchema.parse({
        id: id.trim(),
        studentId: str(get(row, headers, "ID ученика")),
        groupId,
        startedAt: toDateString(get(row, headers, "Дата начала")),
        endedAt: endedAtRaw ? toDateString(endedAtRaw) : null,
      }),
    );
  }
  return enrollments;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n");
}

async function uploadAll(data: {
  settings: Settings;
  clients: Client[];
  students: Student[];
  groups: Group[];
  enrollments: Enrollment[];
}): Promise<void> {
  const owner = process.env.VITE_GITHUB_OWNER;
  const repo = process.env.VITE_DATA_REPO;
  const token = process.env.VITE_GITHUB_TOKEN;
  if (!owner || !repo || !token) {
    throw new Error("Для --upload нужны VITE_GITHUB_OWNER, VITE_DATA_REPO, VITE_GITHUB_TOKEN в .env.local.");
  }
  const ref = { owner, repo, token };

  async function put(filePath: string, value: unknown, message: string): Promise<void> {
    const existing = await getJsonFile(ref, filePath);
    await putJsonFile(ref, filePath, value, existing?.sha ?? null, message);
    console.log(`  ↑ ${filePath}`);
  }

  console.log(`Заливаю в ${owner}/${repo}...`);
  await put("settings.json", data.settings, "Импорт настроек из ETUDE_CRM.xlsx");
  for (const c of data.clients) await put(`clients/${c.id}.json`, c, `Импорт клиента ${c.id}`);
  for (const s of data.students) await put(`students/${s.id}.json`, s, `Импорт ученика ${s.id}`);
  for (const g of data.groups) await put(`groups/${g.id}.json`, g, `Импорт группы ${g.id}`);
  for (const e of data.enrollments) await put(`enrollments/${e.id}.json`, e, `Импорт записи ${e.id}`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const upload = args.includes("--upload");
  const inputPath = args.find((a) => !a.startsWith("--")) ?? path.join(os.homedir(), "Downloads", "ETUDE_CRM.xlsx");

  if (!existsSync(inputPath)) throw new Error(`Файл не найден: ${inputPath}`);

  console.log(`Читаю ${inputPath}...`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(inputPath);

  const { settings, teacherIdByName } = buildSettings(wb);
  const clients = buildClients(wb);
  const students = buildStudents(wb);
  const { groups, idByName: groupIdByName } = buildGroups(wb, teacherIdByName);
  const enrollments = buildEnrollments(wb, groupIdByName);

  await writeJson(path.join(OUTPUT_DIR, "settings.json"), settings);
  for (const c of clients) await writeJson(path.join(OUTPUT_DIR, "clients", `${c.id}.json`), c);
  for (const s of students) await writeJson(path.join(OUTPUT_DIR, "students", `${s.id}.json`), s);
  for (const g of groups) await writeJson(path.join(OUTPUT_DIR, "groups", `${g.id}.json`), g);
  for (const e of enrollments) await writeJson(path.join(OUTPUT_DIR, "enrollments", `${e.id}.json`), e);

  console.log(
    `\nГотово: ${settings.teachers.length} педагогов, ${clients.length} клиентов, ${students.length} учеников, ` +
      `${groups.length} групп, ${enrollments.length} записей.`,
  );
  console.log(`Файлы записаны в ${OUTPUT_DIR}`);

  if (upload) {
    loadEnvLocal();
    await uploadAll({ settings, clients, students, groups, enrollments });
  } else {
    console.log("Загрузка в etude-crm-data не выполнена (нет флага --upload).");
  }
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
