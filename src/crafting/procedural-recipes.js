(function initProceduralRecipesEngine(globalScope) {
  const MATERIAL_KEYWORDS = {
    metal: ["espada", "machado", "martelo", "metal", "ferro", "aço", "aco", "lâmina", "lamina", "mangual", "alabarda", "maça", "maca", "florete", "sabre", "brunea", "cota", "couraça", "couraca", "armadura", "escudo"],
    wood: ["arco", "lança", "lanca", "pique", "besta", "flecha", "virote", "dardo", "cajado", "bastão", "bastao"],
    leather: ["couro", "peles", "gibão", "gibao"],
    cloth: ["acolchoado", "túnica", "tunica", "manto"],
  };

  function parseWeight(weight) {
    if (typeof weight === "number") return weight;
    if (!weight) return 1;
    const parsed = Number.parseFloat(String(weight).replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 1;
  }

  function deriveTier(item) {
    const price = Number(item?.priceGold || 0);
    if (price >= 1000) return 5;
    if (price >= 300) return 4;
    if (price >= 80) return 3;
    if (price >= 20) return 2;
    return 1;
  }

  function inferMaterial(item) {
    const hay = `${item?.name || ""} ${item?.description || ""}`.toLowerCase();
    for (const [material, keywords] of Object.entries(MATERIAL_KEYWORDS)) {
      if (keywords.some((keyword) => hay.includes(keyword))) return material;
    }
    return "metal";
  }

  function makeMetalWeaponCost(item, tier) {
    const weight = parseWeight(item?.weight);
    const metalUnits = Math.max(1, Math.ceil(weight * tier));
    return [
      { id: tier >= 3 ? "aco_refinado" : "minerio_ferro", qtd: metalUnits },
      { id: "carvao", qtd: Math.max(1, Math.ceil(metalUnits / 2)) },
      ...(tier >= 4 ? [{ id: "liga_rara", qtd: tier - 2 }] : []),
      ...(tier >= 5 ? [{ id: "metal_arcano", qtd: 1 }] : []),
    ];
  }

  function makeArmorCost(item, tier, material) {
    const defense = Math.max(1, Number(item?.defenseBonus || 1));
    if (material === "leather") {
      return [
        { id: "couro", qtd: defense * tier },
        { id: "resina_arvore", qtd: Math.max(1, Math.ceil((defense * tier) / 3)) },
      ];
    }
    if (material === "cloth") {
      return [
        { id: "erva_aromatica", qtd: defense * tier },
        { id: "resina_arvore", qtd: Math.max(1, Math.ceil(defense / 2)) },
      ];
    }
    if (material === "wood") {
      return [
        { id: "resina_arvore", qtd: defense * tier },
        { id: "carvao", qtd: Math.max(1, Math.ceil(defense / 2)) },
      ];
    }
    return [
      { id: tier >= 3 ? "aco_refinado" : "minerio_ferro", qtd: defense * tier },
      { id: "carvao", qtd: Math.max(1, Math.ceil((defense * tier) / 2)) },
      ...(tier >= 4 ? [{ id: "liga_rara", qtd: 1 }] : []),
      ...(tier >= 5 ? [{ id: "fragmento_draconico", qtd: 1 }] : []),
    ];
  }

  function makeWoodWeaponCost(item, tier) {
    const weight = parseWeight(item?.weight);
    return [
      { id: "resina_arvore", qtd: Math.max(1, Math.ceil(weight * tier)) },
      { id: "carvao", qtd: Math.max(1, Math.ceil(weight)) },
    ];
  }

  function makeLeatherWeaponCost(item, tier) {
    const weight = parseWeight(item?.weight);
    return [
      { id: "couro", qtd: Math.max(1, Math.ceil(weight * tier)) },
      { id: "carvao", qtd: Math.max(1, Math.ceil(tier / 2)) },
    ];
  }

  function normalizeReagents(reagents) {
    const map = new Map();
    for (const req of reagents || []) {
      if (!req?.id) continue;
      map.set(req.id, (map.get(req.id) || 0) + Math.max(1, Number(req.qtd || 1)));
    }
    return Array.from(map.entries()).map(([id, qtd]) => ({ id, qtd }));
  }

  function createEngine() {
    let recipesByItemId = new Map();

    function generateRecipeForItem(item) {
      if (!item || !item.id) return null;
      if (!["weapon", "armor", "shield"].includes(item.type)) return null;
      const tier = deriveTier(item);
      const material = inferMaterial(item);
      let reagentes = [];
      if (item.type === "weapon") {
        if (material === "wood") reagentes = makeWoodWeaponCost(item, tier);
        else if (material === "leather" || material === "cloth") reagentes = makeLeatherWeaponCost(item, tier);
        else reagentes = makeMetalWeaponCost(item, tier);
      } else {
        reagentes = makeArmorCost(item, tier, material);
      }
      const normalized = normalizeReagents(reagentes);
      return {
        id: `proc_${item.id}`,
        source: "procedural",
        nome: `Forjar ${item.name}`,
        profissao_id: "ferraria",
        nivel_profissao_min: Math.max(1, tier),
        tempo_dias: Math.max(1, Math.ceil(tier / 2)),
        reagentes: normalized,
        output: { type: "item", item_id: item.id, qtd: 1 },
        xp_gain: normalized.reduce((sum, req) => sum + req.qtd, 0),
        metadata: { tier, material },
      };
    }

    function seedCatalog(items, manualRecipes) {
      recipesByItemId = new Map();
      for (const item of items || []) {
        const generated = generateRecipeForItem(item);
        if (generated) recipesByItemId.set(item.id, generated);
      }
      for (const recipe of manualRecipes || []) {
        const outputId = recipe?.output?.item_id;
        if (!outputId) continue;
        recipesByItemId.set(outputId, { ...recipe, source: "manual" });
      }
    }

    function listRecipesForProfession(professionId) {
      return Array.from(recipesByItemId.values()).filter((recipe) => recipe.profissao_id === professionId);
    }

    function canCraft(itemId, inventory, professionId, professionLevel = 1, downtimeDays = 0) {
      const recipe = recipesByItemId.get(itemId);
      if (!recipe || recipe.profissao_id !== professionId) return { ok: false, reason: "recipe_not_found" };
      if (professionLevel < (recipe.nivel_profissao_min || 1)) return { ok: false, reason: "level" };
      if (downtimeDays < (recipe.tempo_dias || 1)) return { ok: false, reason: "downtime" };
      for (const req of recipe.reagentes || []) {
        if ((inventory?.[req.id] || 0) < req.qtd) return { ok: false, reason: "reagents" };
      }
      return { ok: true, recipe };
    }

    function craft(itemId, actorState) {
      const check = canCraft(
        itemId,
        actorState?.reagentsInventory,
        actorState?.professionId,
        actorState?.professionLevel || 1,
        actorState?.downtimeDays || 0,
      );
      if (!check.ok) return check;
      const recipe = check.recipe;

      for (const req of recipe.reagentes || []) {
        actorState.reagentsInventory[req.id] -= req.qtd;
        if (actorState.reagentsInventory[req.id] <= 0) delete actorState.reagentsInventory[req.id];
      }
      actorState.downtimeDays -= recipe.tempo_dias || 1;
      if (typeof actorState.produceItem === "function") {
        for (let i = 0; i < (recipe.output?.qtd || 1); i += 1) actorState.produceItem(recipe.output.item_id);
      }
      return { ok: true, recipe };
    }

    return {
      generateRecipeForItem,
      seedCatalog,
      listRecipesForProfession,
      canCraft,
      craft,
    };
  }

  globalScope.ProceduralRecipesEngine = createEngine();
})(window);
