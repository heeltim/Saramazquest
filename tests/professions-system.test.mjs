import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const srd = JSON.parse(fs.readFileSync(new URL("../data/rpg_srd_base.json", import.meta.url), "utf8"));
const itemsDb = JSON.parse(fs.readFileSync(new URL("../data/items.json", import.meta.url), "utf8"));
const itemIds = new Set((itemsDb.items || []).map((i) => i.id));

function collect(p) {
  p.downtime_days -= 1;
  p.reagents_inventory.erva_comum = (p.reagents_inventory.erva_comum || 0) + 2;
  p.professions_progress.alquimia.xp += 20;
}

function craft(p) {
  if ((p.reagents_inventory.erva_comum || 0) < 2) return false;
  if (!itemIds.has("balsamo_restaurador")) return false;
  p.reagents_inventory.erva_comum -= 2;
  p.inventory.push("balsamo_restaurador");
  p.professions_progress.alquimia.xp += 25;
  return true;
}

test("coletar reduz downtime e adiciona reagentes", () => {
  const p = { downtime_days: 2, reagents_inventory: {}, professions_progress: { alquimia: { xp: 0, level: 1 } } };
  collect(p);
  assert.equal(p.downtime_days, 1);
  assert.equal(p.reagents_inventory.erva_comum, 2);
});

test("craftar falha sem reagentes", () => {
  const p = { reagents_inventory: {}, inventory: [], professions_progress: { alquimia: { xp: 0, level: 1 } } };
  assert.equal(craft(p), false);
});

test("craftar usa item_id existente no banco unificado", () => {
  assert.equal(itemIds.has("balsamo_restaurador"), true);
  for (const recipe of srd.recipes) {
    assert.equal(itemIds.has(recipe.output.item_id), true, `item_id inexistente: ${recipe.output.item_id}`);
  }
});

test("xp de profissão independe do nível do personagem", () => {
  const p = {
    level: 1,
    reagents_inventory: { erva_comum: 2 },
    inventory: [],
    professions_progress: { alquimia: { xp: 95, level: 1 } },
  };
  const ok = craft(p);
  assert.equal(ok, true);
  assert.equal(p.level, 1);
  assert.equal(p.professions_progress.alquimia.xp > 95, true);
});
