import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { loadSrdData, validateSrdData } from "../scripts/rpg-data-tools.mjs";

function loadShopItems() {
  return ["taberna", "arsenal", "ferreiro"].flatMap((id) => {
    const json = JSON.parse(fs.readFileSync(new URL(`../data/shops/shop_${id}.json`, import.meta.url), "utf8"));
    return json.items || [];
  });
}

test("todos os ids de traits referenciados por raças existem", () => {
  const data = loadSrdData();
  const traitIds = new Set(Object.keys(data.trait_dictionary));

  for (const race of data.races) {
    for (const traitId of race.tracos) {
      assert.ok(traitIds.has(traitId), `Trait ${traitId} não existe (race: ${race.id}).`);
    }
  }
});

test("todos os ids de features referenciados por classes existem", () => {
  const data = loadSrdData();
  const featureIds = new Set(Object.keys(data.class_feature_dictionary));

  for (const cls of data.classes) {
    for (const featureList of Object.values(cls.features_by_level)) {
      for (const featureId of featureList) {
        assert.ok(featureIds.has(featureId), `Feature ${featureId} não existe (classe: ${cls.id}).`);
      }
    }
  }
});

test("todo item craftável possui metadados para geração procedural", () => {
  const data = loadSrdData();
  const itemsById = new Map(loadShopItems().map((item) => [item.id, item]));

  for (const recipe of data.recipes) {
    if (recipe.output?.type !== "item") continue;

    const item = itemsById.get(recipe.output.item_id);
    assert.ok(item, `Item ${recipe.output.item_id} da receita ${recipe.id} não existe no banco de lojas.`);
    assert.equal(typeof item.weight, "number", `Item ${item.id} precisa de weight numérico.`);
    assert.ok(Array.isArray(item.tags) && item.tags.length > 0, `Item ${item.id} precisa de tags.`);
    assert.ok(item.tags.some((tag) => tag.startsWith("profession:")), `Item ${item.id} sem tag de profissão.`);
    assert.ok(item.tags.some((tag) => tag.startsWith("biome:")), `Item ${item.id} sem tag de bioma.`);

    if (item.type === "weapon" || item.type === "armor") {
      assert.equal(typeof item.tier, "number", `Item ${item.id} precisa de tier numérico.`);
      assert.equal(typeof item.material, "string", `Item ${item.id} precisa de material.`);
    }
  }
});

test("validador geral passa sem erros", () => {
  const report = validateSrdData(loadSrdData());
  assert.equal(report.ok, true, `Erros: ${report.errors.join("; ")}`);
});
