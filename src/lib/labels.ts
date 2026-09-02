/** Russian display labels for schema enums — mirrors the studio's own Excel terminology. */

export const CLIENT_TYPE_LABEL: Record<string, string> = { parent: "Родитель", self: "Сам ученик" };
export const CLIENT_STATUS_LABEL: Record<string, string> = { active: "Активен", paused: "Пауза", left: "Ушёл" };
export const STUDENT_STATUS_LABEL: Record<string, string> = {
  trial: "Пробный",
  active: "Активен",
  paused: "Пауза",
  left: "Ушёл",
};
export const SEX_LABEL: Record<string, string> = { M: "М", F: "Ж" };
export const BILLING_LABEL: Record<string, string> = { monthly: "Фикс за месяц", perLesson: "За занятие" };
export const CASH_OPERATION_TYPE_LABEL: Record<string, string> = {
  topup: "Пополнение",
  refund: "Возврат",
  otherCharge: "Прочее списание",
  adjustPlus: "Корректировка +",
  adjustMinus: "Корректировка −",
};
export const LESSON_STATUS_LABEL: Record<string, string> = {
  held: "Состоялась",
  lateCancel: "Поздняя отмена",
  cancelledInTime: "Отменена вовремя",
  cancelledByStudio: "Отменена студией",
};
export const WEEKDAY_LABEL: Record<string, string> = {
  Mon: "Пн",
  Tue: "Вт",
  Wed: "Ср",
  Thu: "Чт",
  Fri: "Пт",
  Sat: "Сб",
  Sun: "Вс",
};
