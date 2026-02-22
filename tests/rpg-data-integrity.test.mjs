import test from "node:test";
import assert from "node:assert/strict";
import { loadSrdData, validateSrdData } from "../scripts/rpg-data-tools.mjs";

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

test("validador geral passa sem erros", () => {
  const report = validateSrdData(loadSrdData());
  assert.equal(report.ok, true, `Erros: ${report.errors.join("; ")}`);
});
