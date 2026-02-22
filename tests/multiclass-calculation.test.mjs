import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const CLASSES = JSON.parse(fs.readFileSync(new URL("../data/generated/classes.db.json", import.meta.url), "utf8"));

function rollSequenceSeed(text) {
  let hash = 2166136261;
  const str = String(text || "seed");
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rollDeterministicD(seedText, sides) {
  let state = rollSequenceSeed(seedText);
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  const normalized = (state >>> 0) / 4294967296;
  return Math.max(1, Math.floor(normalized * sides) + 1);
}

function parseHitDieSize(hitDie) {
  const match = String(hitDie || "d10").trim().toLowerCase().match(/^d(\d+)$/);
  return match ? parseInt(match[1], 10) : 10;
}

function ensureHpRollsByClass(p, classEntries) {
  if (!Array.isArray(p.hpRollsByClass)) p.hpRollsByClass = [];
  p.hpRollsByClass = classEntries.map((entry) => {
    const hitDieSize = parseHitDieSize(CLASSES[entry.classId]?.hitDie || "d10");
    const rolls = [];
    for (let idx = 1; idx <= entry.level; idx += 1) {
      const seed = `${p.owner}|${entry.classId}|${p.race}|${p.name}|${idx}|d${hitDieSize}`;
      rolls.push(rollDeterministicD(seed, hitDieSize));
    }
    return { classId: entry.classId, level: entry.level, hitDieSize, rolls };
  });
  return p.hpRollsByClass;
}

function magicPointsForClass(classId, level) {
  const cls = CLASSES[classId];
  const cfg = cls?.magicPoints || { enabled: false };
  if (!cfg.enabled) return 0;
  if (level < (parseInt(cfg.starts_at_level, 10) || 1)) return 0;
  const base = parseInt(cls?.magicPointTable?.[String(level)] || 0, 10) || 0;
  const multiplier = Number.isFinite(Number(cfg.multiplier)) ? Number(cfg.multiplier) : 1;
  return Math.floor(base * multiplier);
}

test("mago 5 + guerreiro 5 soma PM por classe e mantém hp_rolls por classe", () => {
  const p = { owner: "tester", race: "Humano", name: "Arin" };
  const classes = [
    { classId: "Mago", level: 5 },
    { classId: "Guerreiro", level: 5 },
  ];

  const hpRolls = ensureHpRollsByClass(p, classes);
  const totalPm = magicPointsForClass("Mago", 5) + magicPointsForClass("Guerreiro", 5);

  assert.equal(totalPm, 15);
  assert.equal(hpRolls.length, 2);
  assert.deepEqual(hpRolls.map((entry) => entry.classId), ["Mago", "Guerreiro"]);
  assert.equal(hpRolls[0].rolls.length, 5);
  assert.equal(hpRolls[1].rolls.length, 5);
});

test("clérigo 3 + mago 4 soma PM sem nível efetivo", () => {
  const totalPm = magicPointsForClass("Clérigo", 3) + magicPointsForClass("Mago", 4);
  assert.equal(totalPm, 17);
});
