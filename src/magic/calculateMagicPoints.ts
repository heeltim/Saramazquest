import type { ClassRecord, RpgSrdBase } from "../types/rpg-srd";

export function calculateMagicPoints(
  level: number,
  classId: string,
  classes: ClassRecord[],
  baseTable: RpgSrdBase["magic_point_tables"]["universal_base"]
): number {
  const lv = Math.max(1, Math.min(20, Math.floor(level)));
  const cls = classes.find((it) => it.id === classId);
  if (!cls?.magic_points?.enabled) return 0;

  const startsAt = cls.magic_points.starts_at_level ?? 1;
  if (lv < startsAt) return 0;

  const multiplier = cls.magic_points.multiplier ?? 1;
  const base = Number(baseTable[String(lv)] || 0);
  return Math.max(0, Math.floor(base * multiplier));
}
