import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const scriptSource = fs.readFileSync(new URL("../src/crafting/procedural-recipes.js", import.meta.url), "utf8");
const manualRecipes = JSON.parse(fs.readFileSync(new URL("../data/recipes.manual.json", import.meta.url), "utf8")).recipes;
const arsenal = JSON.parse(fs.readFileSync(new URL("../data/shops/shop_arsenal.json", import.meta.url), "utf8")).items;

function createEngine() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(scriptSource, context);
  return context.window.ProceduralRecipesEngine;
}

test("generateRecipeForItem cria regra procedural para arma metálica", () => {
  const engine = createEngine();
  const sword = arsenal.find((it) => it.id === "espada_longa");
  const recipe = engine.generateRecipeForItem(sword);
  assert.equal(recipe.profissao_id, "ferraria");
  assert.equal(recipe.output.item_id, "espada_longa");
  assert.equal(recipe.reagentes.some((r) => r.id === "carvao"), true);
});

test("manual override substitui receita procedural por item", () => {
  const engine = createEngine();
  engine.seedCatalog(arsenal, manualRecipes);
  const recipes = engine.listRecipesForProfession("ferraria");
  const espada = recipes.find((r) => r.output.item_id === "espada_longa");
  assert.equal(espada.source, "manual");
  assert.equal(espada.id, "fer_lamina_draconica");
});

test("craft consome reagentes e produz item sem clonar banco", () => {
  const engine = createEngine();
  engine.seedCatalog(arsenal, manualRecipes);
  const actorState = {
    professionId: "ferraria",
    professionLevel: 5,
    downtimeDays: 3,
    reagentsInventory: { metal_arcano: 2, fragmento_draconico: 1 },
    produced: [],
    produceItem(itemId) {
      this.produced.push(itemId);
    },
  };
  const crafted = engine.craft("espada_longa", actorState);
  assert.equal(crafted.ok, true);
  assert.deepEqual(actorState.produced, ["espada_longa"]);
  assert.equal(actorState.reagentsInventory.metal_arcano, undefined);
  assert.equal(actorState.downtimeDays, 1);
});
