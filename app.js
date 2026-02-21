/* ================= CONFIG ================= */
const STORAGE_KEY = "rpgquest_v2_scene";
let room = "arena";
let currentUser =
  prompt("Digite seu nome:") || "Jogador" + Math.floor(Math.random() * 1000);
document.getElementById("meName").textContent = currentUser;

/* ================= SCENE DEFAULT ================= */
const DEFAULT_COLS = 20;
const DEFAULT_ROWS = 12;

const DEFAULT_SCENE = {
  cols: DEFAULT_COLS,
  rows: DEFAULT_ROWS,
  bgUrl: "",
  bgX: 0,
  bgY: 0,
  bgScale: 120, // %
  bgOpacity: 65, // %
  tiles: [], // string array: "floor" | "wall" | "void"
};

const DEFAULT_EQUIPPED = {
  weapon: null,
  armor: null,
  shield: null,
  ring: null,
  cloak: null,
  misc: null,
};

function createEmptyEquipped() {
  return { ...DEFAULT_EQUIPPED };
}

/* ================= BANCO: RAÇAS / CLASSES ================= */
const RACES = {
  Humano: {
    bonus: { forca: 1, destreza: 1, espirito: 1 },
    abilities: [
      {
        icon: "🌍",
        name: "Adaptável",
        desc: "+1 em todos os atributos.",
        manaCost: 0,
      },
      {
        icon: "🔥",
        name: "Determinação",
        desc: "1 vez por turno, pode repetir uma ação/rolagem (futuro).",
        manaCost: 0,
      },
    ],
  },
  Elfo: {
    bonus: { forca: 0, destreza: 2, espirito: 1 },
    abilities: [
      {
        icon: "🌙",
        name: "Visão Noturna",
        desc: "Enxerga no escuro (futuro).",
        manaCost: 0,
      },
      {
        icon: "✨",
        name: "Precisão Élfica",
        desc: "+1 em ações de precisão (futuro).",
        manaCost: 0,
      },
    ],
  },
  Anao: {
    bonus: { forca: 2, destreza: 0, espirito: 1 },
    abilities: [
      {
        icon: "🛡️",
        name: "Resistência Anã",
        desc: "Redução de dano físico (futuro).",
        manaCost: 0,
      },
      {
        icon: "⛰️",
        name: "Vigor de Pedra",
        desc: "+2 HP por nível (já entra no HP Máx).",
        manaCost: 0,
      },
    ],
  },
};

const CLASSES = {
  Guerreiro: {
    bonus: { forca: 2, destreza: 0, espirito: 0 },
    hpMod: 6,
    manaMod: -2,
    abilities: [
      {
        icon: "⚔️",
        name: "Golpe Poderoso",
        desc: "+3 dano no próximo ataque (futuro).",
        manaCost: 0,
      },
      {
        icon: "🛡️",
        name: "Postura Defensiva",
        desc: "+2 defesa por 1 turno (futuro).",
        manaCost: 0,
      },
    ],
  },
  Mago: {
    bonus: { forca: 0, destreza: 0, espirito: 2 },
    hpMod: -2,
    manaMod: 10,
    abilities: [
      {
        icon: "🔥",
        name: "Bola de Fogo",
        desc: "Ataque mágico (futuro).",
        manaCost: 3,
      },
      {
        icon: "🔮",
        name: "Escudo Arcano",
        desc: "Absorve dano (futuro).",
        manaCost: 2,
      },
    ],
  },
  Arqueiro: {
    bonus: { forca: 0, destreza: 2, espirito: 0 },
    hpMod: 2,
    manaMod: 2,
    abilities: [
      {
        icon: "🏹",
        name: "Tiro Preciso",
        desc: "+4 precisão (futuro).",
        manaCost: 1,
      },
      {
        icon: "👣",
        name: "Passo Sombrio",
        desc: "Movimento tático (futuro).",
        manaCost: 1,
      },
    ],
  },
};

/* ================= BANCO: ITENS (resumo) ================= */
const ITEM_DB = {
  dagger: {
    name: "Adaga",
    icon: "🗡️",
    type: "weapon",
    equipSlot: "weapon",
    desc: "+1 FOR (arma leve).",
    mods: { str: +1 },
  },
  short_sword: {
    name: "Espada Curta",
    icon: "⚔️",
    type: "weapon",
    equipSlot: "weapon",
    desc: "+2 FOR (padrão).",
    mods: { str: +2 },
  },
  arcane_staff: {
    name: "Cajado Arcano",
    icon: "🪄",
    type: "weapon",
    equipSlot: "weapon",
    desc: "+2 ESP (arma de mago).",
    mods: { spr: +2 },
  },

  icebolt: {
    name: "Raio de Gelo",
    icon: "❄️",
    type: "weapon",
    equipSlot: "weapon",
    desc: "+2 ESP. Magia básica (sem custo).",
    mods: { spr: +2 },
  },
  firebolt: {
    name: "Faísca de Fogo",
    icon: "🔥",
    type: "weapon",
    equipSlot: "weapon",
    desc: "+2 ESP. Magia básica (sem custo).",
    mods: { spr: +2 },
  },

  leather_armor: {
    name: "Armadura de Couro",
    icon: "🥋",
    type: "armor",
    equipSlot: "armor",
    desc: "+1 Defesa.",
    mods: { defense: +1 },
  },
  chainmail: {
    name: "Cota de Malha",
    icon: "⛓️",
    type: "armor",
    equipSlot: "armor",
    desc: "+2 Defesa.",
    mods: { defense: +2 },
  },
  shield: {
    name: "Escudo",
    icon: "🛡️",
    type: "shield",
    equipSlot: "shield",
    desc: "+1 Defesa.",
    mods: { defense: +1 },
  },
  heavy_shield: {
    name: "Escudo Pesado",
    icon: "🛡️",
    type: "shield",
    equipSlot: "shield",
    desc: "+2 Defesa.",
    mods: { defense: +2 },
  },

  ring_protection: {
    name: "Anel de Proteção",
    icon: "💍",
    type: "ring",
    equipSlot: "ring",
    desc: "+1 Defesa.",
    mods: { defense: +1 },
  },
  elven_cloak: {
    name: "Capa Élfica",
    icon: "🧥",
    type: "cloak",
    equipSlot: "cloak",
    desc: "+1 DES.",
    mods: { dex: +1 },
  },
  backpack: {
    name: "Mochila",
    icon: "🎒",
    type: "misc",
    equipSlot: "misc",
    desc: "+6 slots inventário.",
    mods: { invExtra: +6 },
  },

  potion_healing: {
    name: "Poção de Cura",
    icon: "🧪",
    type: "potion",
    desc: "+10 HP (consome).",
    consume: { hp: +10 },
  },
  potion_mana: {
    name: "Poção de Mana",
    icon: "🔵",
    type: "potion",
    desc: "+8 MP (consome).",
    consume: { mana: +8 },
  },
};
const SHOP = [
  { id: "dagger", price: 8 },
  { id: "short_sword", price: 15 },
  { id: "arcane_staff", price: 12 },
  { id: "icebolt", price: 0 },
  { id: "firebolt", price: 0 },
  { id: "leather_armor", price: 10 },
  { id: "chainmail", price: 30 },
  { id: "shield", price: 10 },
  { id: "heavy_shield", price: 25 },
  { id: "ring_protection", price: 40 },
  { id: "elven_cloak", price: 35 },
  { id: "backpack", price: 12 },
  { id: "potion_healing", price: 8 },
  { id: "potion_mana", price: 10 },
];

/* ================= STORAGE ================= */
function load() {
  return (
    JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      rooms: {},
      chat: {},
      scenes: {},
    }
  );
}
function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
let data = load();
if (!data.rooms[room]) data.rooms[room] = {};
if (!data.chat[room]) data.chat[room] = [];
if (!data.scenes[room]) data.scenes[room] = structuredClone(DEFAULT_SCENE);

/* ================= SCENE HELPERS ================= */
function ensureScene() {
  let data = load();
  if (!data.scenes) data.scenes = {};
  if (!data.scenes[room]) data.scenes[room] = structuredClone(DEFAULT_SCENE);

  const s = data.scenes[room];

  // cols/rows
  s.cols = s.cols || DEFAULT_COLS;
  s.rows = s.rows || DEFAULT_ROWS;

  // tiles size
  const needed = s.cols * s.rows;
  if (!Array.isArray(s.tiles)) s.tiles = [];
  if (s.tiles.length !== needed) {
    const newTiles = new Array(needed).fill("floor");
    for (let i = 0; i < Math.min(s.tiles.length, needed); i++) {
      newTiles[i] = s.tiles[i] || "floor";
    }
    s.tiles = newTiles;
  }

  // defaults
  s.bgUrl = s.bgUrl || "";
  s.bgX = Number.isFinite(s.bgX) ? s.bgX : 0;
  s.bgY = Number.isFinite(s.bgY) ? s.bgY : 0;
  s.bgScale = Number.isFinite(s.bgScale) ? s.bgScale : 120;
  s.bgOpacity = Number.isFinite(s.bgOpacity) ? s.bgOpacity : 65;

  data.scenes[room] = s;
  save(data);
}
ensureScene();

function applySceneCSS() {
  const s = load().scenes[room];
  const arena = document.getElementById("arena");
  arena.style.setProperty("--cols", s.cols);
  arena.style.setProperty("--rows", s.rows);

  const bg = s.bgUrl ? `url("${s.bgUrl}")` : "none";
  arena.style.setProperty("--scene-bg", bg);
  arena.style.setProperty("--scene-scale", `${s.bgScale}%`);
  arena.style.setProperty("--scene-x", `${s.bgX}px`);
  arena.style.setProperty("--scene-y", `${s.bgY}px`);
  arena.style.setProperty("--scene-opacity", (s.bgOpacity / 100).toString());
}

function tileIndex(x, y) {
  const s = load().scenes[room];
  return y * s.cols + x;
}
function getTile(x, y) {
  const s = load().scenes[room];
  const idx = y * s.cols + x;
  return s.tiles[idx] || "floor";
}
function setTile(x, y, type) {
  let data = load();
  const s = data.scenes[room];
  const idx = y * s.cols + x;
  s.tiles[idx] = type;
  save(data);
}

/* ================= PLAYER SCHEMA ================= */
function randomColor() {
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
  );
}

function ensurePlayerSchema(p) {
  if (p.hp === undefined) p.hp = 100;
  if (p.hpMax === undefined) p.hpMax = 100;
  if (p.mana === undefined) p.mana = 50;
  if (p.manaMax === undefined) p.manaMax = 50;

  if (p.race === undefined) p.race = "Humano";
  if (p.class === undefined) p.class = "Guerreiro";
  if (p.level === undefined) p.level = 1;
  if (p.owner === undefined) p.owner = "";
  if (p.onTable === undefined) p.onTable = true;

  if (p.gold === undefined) p.gold = 60;

  if (p.attributes === undefined) {
    p.attributes = { forca: 5, destreza: 5, espirito: 5 };
  }
  if (p.skills === undefined) p.skills = [];
  if (p.inventory === undefined) p.inventory = [];
  if (p.equipped === undefined) p.equipped = createEmptyEquipped();

  if (p.color === undefined) p.color = randomColor();

  const s = load().scenes[room];
  if (p.x === undefined) p.x = Math.floor(Math.random() * s.cols);
  if (p.y === undefined) p.y = Math.floor(Math.random() * s.rows);
}

function ensureAllPlayersSchema() {
  let data = load();
  if (!data.rooms[room]) data.rooms[room] = {};
  Object.keys(data.rooms[room]).forEach((name) => {
    ensurePlayerSchema(data.rooms[room][name]);
  });
  save(data);
}
ensureAllPlayersSchema();

/* ================= CHAT ================= */
function pushChat(user, text) {
  let data = load();
  if (!data.chat[room]) data.chat[room] = [];
  data.chat[room].push({ user, text });
  save(data);
  updateChat();
}
function pushAction(user, text) {
  pushChat(user, "* " + text);
}

function sendMessage() {
  let input = document.getElementById("messageInput");
  let text = input.value.trim();
  if (!text) return;

  if (handleRollCommand(text)) {
    input.value = "";
    return;
  }

  pushChat(currentUser, text);
  input.value = "";
  updateChat();
}

function clampDiceCount(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return 1;
  return Math.min(20, Math.max(1, n));
}

function rollPool(count, sides) {
  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  const total = rolls.reduce((sum, n) => sum + n, 0);
  return { count, sides, rolls, total };
}

function parseDiceExpression(rawExpression) {
  const expression = (rawExpression || "").toLowerCase().replace(/\s+/g, "");
  if (!expression) return null;

  const allowedSides = new Set([4, 6, 8, 10, 12, 20, 100]);
  const parts = expression.split("+").filter(Boolean);
  if (parts.length === 0) return null;

  const pools = [];
  for (const part of parts) {
    const m = part.match(/^(\d*)d(\d+)$/);
    if (!m) return null;

    const rawCount = m[1] || "1";
    const sides = parseInt(m[2], 10);
    if (!allowedSides.has(sides)) return null;

    const count = clampDiceCount(rawCount);
    pools.push({ count, sides });
  }
  return pools;
}

function formatRollAction(pools, sourceExpression) {
  const rolled = pools.map((p) => rollPool(p.count, p.sides));
  const total = rolled.reduce((sum, p) => sum + p.total, 0);
  const details = rolled
    .map((p) => `${p.count}d${p.sides}=[${p.rolls.join(",")}]`)
    .join(" + ");
  return `rolou ${sourceExpression} → ${details} = ${total}`;
}

function handleRollCommand(text) {
  const cmd = text.match(/^\/(?:roll|r)(?:\s+(.+))?$/i);
  if (!cmd) return false;

  const expression = (cmd[1] || "").trim() || "1d20";
  const pools = parseDiceExpression(expression);
  if (!pools) {
    pushChat(
      "Sistema",
      "Uso: /roll 2d6 + 1d4 (ou /r 1d20). Dados: d4,d6,d8,d10,d12,d20,d100",
    );
    return true;
  }

  const normalized = pools.map((p) => `${p.count}d${p.sides}`).join(" + ");
  pushAction(currentUser, formatRollAction(pools, normalized));
  return true;
}

function rollDiceFromTray(sides) {
  const input = document.getElementById(`diceCount${sides}`);
  const count = clampDiceCount(input?.value || "1");
  if (input) input.value = String(count);

  const pools = [{ count, sides }];
  pushAction(currentUser, formatRollAction(pools, `${count}d${sides}`));
}

document.getElementById("messageInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
function updateChat() {
  let data = load();
  let chatBox = document.getElementById("chat");
  chatBox.innerHTML = "";

  (data.chat[room] || []).forEach((msg) => {
    let div = document.createElement("div");
    div.className = "chatMessage";

    if (msg.text.startsWith("*")) {
      div.classList.add("chatAction");
      div.innerHTML = `<strong>${msg.user}</strong> ${msg.text}`;
    } else if (msg.text.startsWith("(")) {
      div.classList.add("chatOOC");
      div.innerHTML = msg.text;
    } else {
      div.classList.add("chatSpeak");
      div.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`;
    }

    chatBox.appendChild(div);
  });

  chatBox.scrollTop = chatBox.scrollHeight;
}

/* ================= ITENS ================= */
function getEquippedItemIds(p) {
  const eq = p.equipped || {};
  return Object.values(eq).filter(Boolean);
}
function computeItemMods(p) {
  const ids = getEquippedItemIds(p);
  const mods = {
    str: 0,
    dex: 0,
    spr: 0,
    defense: 0,
    hpMax: 0,
    manaMax: 0,
    invExtra: 0,
  };
  ids.forEach((id) => {
    const it = ITEM_DB[id];
    if (!it || !it.mods) return;
    if (it.mods.str) mods.str += it.mods.str;
    if (it.mods.dex) mods.dex += it.mods.dex;
    if (it.mods.spr) mods.spr += it.mods.spr;
    if (it.mods.defense) mods.defense += it.mods.defense;
    if (it.mods.hpMax) mods.hpMax += it.mods.hpMax;
    if (it.mods.manaMax) mods.manaMax += it.mods.manaMax;
    if (it.mods.invExtra) mods.invExtra += it.mods.invExtra;
  });
  return mods;
}
function invCount(p) {
  return (p.inventory || []).length;
}
function invMax(p) {
  return p.invMax || 12;
}

function addItemToPlayer(p, itemId) {
  if (!ITEM_DB[itemId]) return { ok: false, msg: "Item não existe" };
  if (invCount(p) >= invMax(p)) return { ok: false, msg: "Inventário cheio" };
  p.inventory.push(itemId);
  return { ok: true };
}
function removeItemFromPlayer(p, itemId) {
  const idx = (p.inventory || []).indexOf(itemId);
  if (idx >= 0) p.inventory.splice(idx, 1);
}
function equipItem(p, itemId) {
  const it = ITEM_DB[itemId];
  if (!it || !it.equipSlot) return;
  if (!(p.inventory || []).includes(itemId)) return;
  p.equipped[it.equipSlot] = itemId;
}
function unequipSlot(p, slot) {
  if (!p.equipped) return;
  p.equipped[slot] = null;
}
function useConsumable(p, itemId) {
  const it = ITEM_DB[itemId];
  if (!it || !it.consume) return { ok: false };
  if (!(p.inventory || []).includes(itemId)) return { ok: false };

  if (it.consume.hp) {
    p.hp = Math.max(0, Math.min(p.hpMax, p.hp + it.consume.hp));
  }
  if (it.consume.mana) {
    p.mana = Math.max(0, Math.min(p.manaMax, p.mana + it.consume.mana));
  }
  removeItemFromPlayer(p, itemId);
  return { ok: true };
}

/* ================= REGRAS / RECALC ================= */
function ensureMageFreeWeapon(p) {
  if (p.class !== "Mago") return;
  if (!p.inventory) p.inventory = [];
  if (!p.inventory.includes("icebolt")) p.inventory.push("icebolt");
  if (!p.inventory.includes("firebolt")) p.inventory.push("firebolt");
  if (!p.equipped) p.equipped = createEmptyEquipped();
  if (!p.equipped.weapon) p.equipped.weapon = "icebolt";
}

function recalcFromSheet(p) {
  const base = { forca: 3, destreza: 3, espirito: 3 };
  const race = RACES[p.race] || RACES.Humano;
  const cls = CLASSES[p.class] || CLASSES.Guerreiro;

  let level = parseInt(p.level, 10);
  if (isNaN(level) || level < 1) level = 1;
  p.level = level;

  ensureMageFreeWeapon(p);

  const bonusR = race.bonus;
  const bonusC = cls.bonus;

  let forca = base.forca + (bonusR.forca || 0) + (bonusC.forca || 0);
  let destreza =
    base.destreza + (bonusR.destreza || 0) + (bonusC.destreza || 0);
  let espirito =
    base.espirito + (bonusR.espirito || 0) + (bonusC.espirito || 0);

  const itemMods = computeItemMods(p);
  forca += itemMods.str;
  destreza += itemMods.dex;
  espirito += itemMods.spr;

  p.attributes = { forca, destreza, espirito };

  let hpMax = 10 + forca * 3 + cls.hpMod + (level - 1) * 2;
  let manaMax = 5 + espirito * 3 + cls.manaMod + (level - 1) * 2;

  if (p.race === "Anao") hpMax += level * 2;

  hpMax += itemMods.hpMax;
  manaMax += itemMods.manaMax;

  hpMax = Math.max(1, hpMax);
  manaMax = Math.max(0, manaMax);

  const hpRatio = p.hpMax > 0 ? p.hp / p.hpMax : 1;
  const manaRatio = p.manaMax > 0 ? p.mana / p.manaMax : 1;

  p.hpMax = hpMax;
  p.manaMax = manaMax;

  p.hp = Math.round(Math.max(0, Math.min(p.hpMax, p.hpMax * hpRatio)));
  p.mana = Math.round(Math.max(0, Math.min(p.manaMax, p.manaMax * manaRatio)));

  p.defense = 10 + destreza + (itemMods.defense || 0);
  p.skills = [...(race.abilities || []), ...(cls.abilities || [])];
  p.invMax = 12 + (itemMods.invExtra || 0);
}

/* ================= CREATE USER ================= */
data = load();
if (!data.rooms[room][currentUser]) {
  const s = data.scenes[room];
  data.rooms[room][currentUser] = {
    x: Math.floor(Math.random() * s.cols),
    y: Math.floor(Math.random() * s.rows),
    hp: 100,
    hpMax: 100,
    mana: 50,
    manaMax: 50,
    race: "Humano",
    class: "Guerreiro",
    level: 1,
    owner: "",
    attributes: { forca: 5, destreza: 5, espirito: 5 },
    skills: [],
    gold: 60,
    inventory: ["potion_healing"],
    equipped: createEmptyEquipped(),
    color: randomColor(),
    onTable: true,
  };
  ensurePlayerSchema(data.rooms[room][currentUser]);
  recalcFromSheet(data.rooms[room][currentUser]);
  save(data);
} else {
  ensurePlayerSchema(data.rooms[room][currentUser]);
  recalcFromSheet(data.rooms[room][currentUser]);
  save(data);
}

/* ================= GRID ================= */
const arena = document.getElementById("arena");
function createGrid() {
  ensureScene();
  const s = load().scenes[room];
  arena.innerHTML = "";
  applySceneCSS();

  for (let y = 0; y < s.rows; y++) {
    for (let x = 0; x < s.cols; x++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.x = x;
      cell.dataset.y = y;
      arena.appendChild(cell);
    }
  }
}

/* ================= RENDER ================= */
function updateArena() {
  ensureScene();
  let data = load();
  let players = data.rooms[room];
  const s = data.scenes[room];

  applySceneCSS();

  let cells = [...document.querySelectorAll(".cell")];
  // aplica tiles nas células
  for (const cell of cells) {
    const x = parseInt(cell.dataset.x, 10);
    const y = parseInt(cell.dataset.y, 10);
    const t = s.tiles[tileIndex(x, y)] || "floor";
    cell.classList.remove("tile-floor", "tile-wall", "tile-void");
    cell.classList.add("tile-" + t);
    cell.innerHTML = "";
  }

  // tokens
  Object.keys(players).forEach((name) => {
    let p = players[name];
    ensurePlayerSchema(p);
    recalcFromSheet(p);

    if (!p.onTable) return;

    // se cair em wall/void, ajusta pra floor mais próximo (bem simples)
    if (getTile(p.x, p.y) !== "floor") {
      const found = findNearestFloor(p.x, p.y);
      if (found) {
        p.x = found.x;
        p.y = found.y;
      }
    }

    const idx = tileIndex(p.x, p.y);
    const cell = cells[idx];
    if (!cell) return;

    let token = document.createElement("div");
    token.className = "token";
    token.style.background = p.color;
    token.innerText = name[0].toUpperCase();

    token.onclick = (e) => {
      e.stopPropagation();
      showMenu(name, token);
    };

    // HP bar
    let hpBar = document.createElement("div");
    hpBar.className = "bar";
    hpBar.style.bottom = "-4px";
    let hpFill = document.createElement("div");
    hpFill.className = "hpFill";
    let hpPercent = p.hpMax > 0 ? (p.hp / p.hpMax) * 100 : 0;
    hpFill.style.width = hpPercent + "%";
    hpBar.appendChild(hpFill);
    token.appendChild(hpBar);

    // Mana bar
    let manaBar = document.createElement("div");
    manaBar.className = "bar";
    manaBar.style.bottom = "-10px";
    let manaFill = document.createElement("div");
    manaFill.className = "manaFill";
    let manaPercent = p.manaMax > 0 ? (p.mana / p.manaMax) * 100 : 0;
    manaFill.style.width = manaPercent + "%";
    manaBar.appendChild(manaFill);
    token.appendChild(manaBar);

    cell.appendChild(token);
  });

  save(data);
  updateSidebar(players);

  // modais
  if (sheetTargetName) {
    const p = load().rooms[room][sheetTargetName];
    if (p) {
      ensurePlayerSchema(p);
      recalcFromSheet(p);
      renderSheetComputed(p);
      renderEquip(p);
      renderAbilities(p);
    }
  }
  if (invTargetName) {
    const p = load().rooms[room][invTargetName];
    if (p) {
      ensurePlayerSchema(p);
      recalcFromSheet(p);
      renderInventoryModal(p);
    }
  }
}

/* ================= nearest floor ================= */
function findNearestFloor(x0, y0) {
  const s = load().scenes[room];
  const maxR = Math.max(s.cols, s.rows);
  for (let r = 0; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = x0 + dx;
        const y = y0 + dy;
        if (x < 0 || y < 0 || x >= s.cols || y >= s.rows) continue;
        if (getTile(x, y) === "floor") return { x, y };
      }
    }
  }
  return null;
}

/* ================= SIDEBAR ================= */
function updateSidebar(players) {
  let party = document.getElementById("party");
  party.innerHTML = "";

  Object.keys(players).forEach((name) => {
    let p = players[name];
    ensurePlayerSchema(p);
    recalcFromSheet(p);

    const hpPct = p.hpMax > 0 ? (p.hp / p.hpMax) * 100 : 0;
    const mpPct = p.manaMax > 0 ? (p.mana / p.manaMax) * 100 : 0;

    let card = document.createElement("div");
    card.className = "playerCard";

    card.onclick = (e) => {
      e.stopPropagation();
      showMenu(name, card);
    };

    const ownerTxt = p.owner ? ` <span>(${p.owner})</span>` : "";

    card.innerHTML = `
      <div class="miniToken" style="background:${p.color}">
        ${name[0].toUpperCase()}
      </div>
      <div class="playerMain">
        <div class="playerName">${name}${ownerTxt}</div>

        <div class="statRow">
          <div class="statLabel">HP</div>
          <div class="miniBar"><div class="miniHP" style="width:${hpPct}%"></div></div>
          <div class="statValue">${p.hp}/${p.hpMax}</div>
        </div>

        <div class="statRow">
          <div class="statLabel">MP</div>
          <div class="miniBar"><div class="miniMana" style="width:${mpPct}%"></div></div>
          <div class="statValue">${p.mana}/${p.manaMax}</div>
        </div>
      </div>
    `;

    if (!p.onTable) {
      const btn = document.createElement("div");
      btn.className = "addToTableBtn";
      btn.title = "Adicionar de volta à mesa";
      btn.textContent = "➕";
      btn.onclick = (e) => {
        e.stopPropagation();
        addBackToTable(name);
      };
      card.appendChild(btn);
    }

    party.appendChild(card);
  });

  save(load());
}

/* ================= MOVIMENTO (setas + colisão) ================= */
document.addEventListener("keydown", (e) => {
  if (document.activeElement && document.activeElement.id === "messageInput")
    return;

  let data = load();
  let p = data.rooms[room][currentUser];
  if (!p) return;
  ensurePlayerSchema(p);

  if (!p.onTable) return;

  let nx = p.x;
  let ny = p.y;

  if (e.key === "ArrowUp") ny--;
  if (e.key === "ArrowDown") ny++;
  if (e.key === "ArrowLeft") nx--;
  if (e.key === "ArrowRight") nx++;

  const s = data.scenes[room];
  if (nx < 0 || ny < 0 || nx >= s.cols || ny >= s.rows) return;

  // colisão
  const tile = data.scenes[room].tiles[tileIndex(nx, ny)] || "floor";
  if (tile !== "floor") {
    // feedback leve: pisca a célula destino
    flashCell(nx, ny);
    return;
  }

  p.x = nx;
  p.y = ny;

  save(data);
  updateArena();
});

function flashCell(x, y) {
  const idx = tileIndex(x, y);
  const cell = document.querySelectorAll(".cell")[idx];
  if (!cell) return;
  cell.animate(
    [
      { transform: "scale(1)", filter: "brightness(1)" },
      { transform: "scale(1.02)", filter: "brightness(1.35)" },
      { transform: "scale(1)", filter: "brightness(1)" },
    ],
    { duration: 220, easing: "ease-out" },
  );
}

/* ================= MENU ================= */
function showMenu(name, element) {
  removeMenu();

  let menu = document.createElement("div");
  menu.className = "floatingMenu";

  menu.innerHTML = `
    <div class="menuBtn" title="Inventário" onclick="openInventory('${name}')">🎒</div>
    <div class="menuBtn" title="Ficha" onclick="openSheet('${name}')">📜</div>
    <div class="menuBtn" title="HP (+/-)" onclick="editStat('${name}','hp')">❤️</div>
    <div class="menuBtn" title="MP (+/-)" onclick="editStat('${name}','mana')">🔵</div>
    <div class="menuBtn" title="Remover da mesa" onclick="removeFromTable('${name}')">🗑️</div>
  `;

  document.body.appendChild(menu);

  let rect = element.getBoundingClientRect();
  menu.style.left = rect.left + rect.width / 2 - 104 + "px";
  menu.style.top = rect.top - 62 + "px";

  setTimeout(() => {
    document.addEventListener("click", removeMenu);
  }, 10);
}
function removeMenu() {
  let old = document.querySelector(".floatingMenu");
  if (old) old.remove();
  document.removeEventListener("click", removeMenu);
}

/* ================= MESA: remove/add ================= */
function removeFromTable(name) {
  let data = load();
  let p = data.rooms[room][name];
  if (!p) return;
  ensurePlayerSchema(p);
  p.onTable = false;
  save(data);
  removeMenu();
  updateArena();
}
function addBackToTable(name) {
  let data = load();
  let p = data.rooms[room][name];
  if (!p) return;
  ensurePlayerSchema(p);

  const s = data.scenes[room];
  const found = findNearestFloor(
    Math.floor(s.cols / 2),
    Math.floor(s.rows / 2),
  );
  if (found) {
    p.x = found.x;
    p.y = found.y;
  }
  p.onTable = true;

  save(data);
  updateArena();
}

/* ================= EDIT HP/MP (delta) ================= */
function editStat(name, stat) {
  let data = load();
  let p = data.rooms[room][name];
  if (!p) return;
  ensurePlayerSchema(p);
  recalcFromSheet(p);

  let v = prompt(
    `Digite um valor para ${stat.toUpperCase()} (ex: -20 ou +10):`,
    "-10",
  );
  if (v === null) return;

  let delta = parseInt(v, 10);
  if (isNaN(delta)) return;

  if (stat === "hp") {
    p.hp = Math.max(0, Math.min(p.hpMax, p.hp + delta));
  } else {
    p.mana = Math.max(0, Math.min(p.manaMax, p.mana + delta));
  }

  save(data);
  updateArena();
}

/* ================= FICHA ================= */
let sheetTargetName = null;

function openSheet(name) {
  let data = load();
  let p = data.rooms[room][name];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);
  save(data);

  sheetTargetName = name;

  const raceSel = document.getElementById("sheetRace");
  const classSel = document.getElementById("sheetClass");
  raceSel.innerHTML = Object.keys(RACES)
    .map((r) => `<option value="${r}">${r}</option>`)
    .join("");
  classSel.innerHTML = Object.keys(CLASSES)
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");

  document.getElementById("sheetTitle").textContent = `Ficha — ${name}`;
  document.getElementById("sheetSub").textContent =
    `Equipados ficam aqui. Inventário/Loja ficam no 🎒.`;

  document.getElementById("sheetOwner").value = p.owner || "";
  document.getElementById("sheetLevel").value = p.level || 1;
  raceSel.value = p.race;
  classSel.value = p.class;

  renderSheetComputed(p);
  renderEquip(p);
  renderAbilities(p);

  raceSel.onchange = () => previewSheet();
  classSel.onchange = () => previewSheet();
  document.getElementById("sheetLevel").oninput = () => previewSheet();

  document.getElementById("sheetOverlay").style.display = "flex";
}

function previewSheet() {
  if (!sheetTargetName) return;
  let data = load();
  let p = data.rooms[room][sheetTargetName];
  if (!p) return;
  ensurePlayerSchema(p);

  p.race = document.getElementById("sheetRace").value;
  p.class = document.getElementById("sheetClass").value;
  p.level = parseInt(document.getElementById("sheetLevel").value || "1", 10);
  recalcFromSheet(p);
  save(data);

  renderSheetComputed(p);
  renderEquip(p);
  renderAbilities(p);
  updateArena();
}

function renderSheetComputed(p) {
  document.getElementById("statSTR").textContent = p.attributes.forca;
  document.getElementById("statDEX").textContent = p.attributes.destreza;
  document.getElementById("statSPR").textContent = p.attributes.espirito;
  document.getElementById("statDEF").textContent =
    p.defense ?? 10 + p.attributes.destreza;
  document.getElementById("statHPMax").textContent = p.hpMax;
  document.getElementById("statMPMax").textContent = p.manaMax;
  document.getElementById("statHPNow").textContent = p.hp;
  document.getElementById("statMPNow").textContent = p.mana;
}

function renderAbilities(p) {
  const list = document.getElementById("sheetAbilities");
  const skills = p.skills || [];
  list.innerHTML = skills
    .map(
      (a, idx) => `
    <div class="ability">
      <div class="abilityIcon">${a.icon}</div>
      <div style="flex:1;">
        <div class="abilityName">${a.name}</div>
        <div class="abilityDesc">${a.desc}</div>
        <div class="abilityMeta">
          <span>${a.manaCost ? `Custo: <strong>${a.manaCost} MP</strong>` : `Custo: <strong>0 MP</strong>`}</span>
          <button class="smallBtn smallBtnPrimary" onclick="useAbility(${idx})">Usar</button>
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}

function useAbility(skillIndex) {
  if (!sheetTargetName) return;
  let data = load();
  let p = data.rooms[room][sheetTargetName];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);

  const skills = p.skills || [];
  const a = skills[skillIndex];
  if (!a) return;

  const cost = parseInt(a.manaCost || 0, 10) || 0;
  if (cost > 0 && p.mana < cost) {
    alert("Mana insuficiente!");
    return;
  }

  p.mana = Math.max(0, p.mana - cost);
  save(data);

  pushAction(
    currentUser,
    `${sheetTargetName} usou ${a.icon} ${a.name}${cost > 0 ? ` (-${cost} MP)` : ""}.`,
  );
  updateArena();

  renderSheetComputed(p);
  renderEquip(p);
  renderAbilities(p);
}

function renderEquip(p) {
  const eq = p.equipped || createEmptyEquipped();
  function itemName(id) {
    if (!id) return "—";
    const it = ITEM_DB[id];
    return it ? `${it.icon} ${it.name}` : "—";
  }
  const wrap = document.getElementById("equipSlots");
  wrap.innerHTML = `
    ${slotRow("Arma", "weapon", itemName(eq.weapon))}
    ${slotRow("Armadura", "armor", itemName(eq.armor))}
    ${slotRow("Escudo", "shield", itemName(eq.shield))}
    ${slotRow("Anel", "ring", itemName(eq.ring))}
    ${slotRow("Manto", "cloak", itemName(eq.cloak))}
    ${slotRow("Extra", "misc", itemName(eq.misc))}
  `;
}
function slotRow(label, slot, value) {
  return `
    <div class="kv" style="align-items:center; gap:10px;">
      <span style="opacity:.85">${label}</span>
      <strong style="text-align:right; flex:1;">${value}</strong>
      <button class="smallBtn" onclick="unequip('${sheetTargetName}','${slot}')">Remover</button>
    </div>
  `;
}
function unequip(name, slot) {
  let data = load();
  let p = data.rooms[room][name];
  if (!p) return;
  ensurePlayerSchema(p);

  unequipSlot(p, slot);
  recalcFromSheet(p);
  save(data);

  renderSheetComputed(p);
  renderEquip(p);
  renderAbilities(p);
  updateArena();
}

function saveSheet() {
  if (!sheetTargetName) return;
  let data = load();
  let p = data.rooms[room][sheetTargetName];
  if (!p) return;

  ensurePlayerSchema(p);

  p.owner = document.getElementById("sheetOwner").value || "";
  p.level = parseInt(document.getElementById("sheetLevel").value || "1", 10);
  p.race = document.getElementById("sheetRace").value;
  p.class = document.getElementById("sheetClass").value;

  recalcFromSheet(p);
  save(data);

  closeSheet();
  updateArena();
}
function closeSheet() {
  document.getElementById("sheetOverlay").style.display = "none";
  sheetTargetName = null;
}

/* ================= INVENTÁRIO + LOJA ================= */
let invTargetName = null;

function openInventory(name) {
  let data = load();
  let p = data.rooms[room][name];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);
  save(data);

  invTargetName = name;
  document.getElementById("invTitle").textContent = `Inventário — ${name}`;
  document.getElementById("invSub").textContent =
    `Ações via menu ⋯. Loja com ouro. Itens equipados refletem na ficha.`;

  const filter = document.getElementById("shopFilter");
  filter.onchange = () => {
    const p2 = load().rooms[room][invTargetName];
    if (p2) {
      ensurePlayerSchema(p2);
      recalcFromSheet(p2);
      renderInventoryModal(p2);
    }
  };

  renderInventoryModal(p);
  document.getElementById("invOverlay").style.display = "flex";
}
function closeInventory() {
  document.getElementById("invOverlay").style.display = "none";
  invTargetName = null;
  removeMiniMenu();
}
function renderInventoryModal(p) {
  document.getElementById("goldValue").textContent = p.gold ?? 0;
  document.getElementById("invSlotsValue").textContent =
    `${invCount(p)}/${invMax(p)}`;
  renderInvList(p);
  renderShop(p);
}
function renderInvList(p) {
  const box = document.getElementById("invList");
  const inv = p.inventory || [];
  if (inv.length === 0) {
    box.innerHTML = `<div style="opacity:.7;font-size:12px;">Inventário vazio.</div>`;
    return;
  }
  box.innerHTML = inv
    .map((id, idx) => {
      const it = ITEM_DB[id];
      if (!it) return "";
      return `
      <div class="invItem" data-item="${id}" data-idx="${idx}">
        <div class="invIcon">${it.icon}</div>
        <div style="flex:1;">
          <div class="invName">${it.name}</div>
          <div class="invDesc">${it.desc}</div>
        </div>
        <button class="dotBtn" title="Ações" onclick="openItemMenu(event,'${id}',${idx})">⋯</button>
      </div>
    `;
    })
    .join("");
}
function renderShop(p) {
  const list = document.getElementById("shopList");
  const filter = document.getElementById("shopFilter").value;
  const rows = SHOP.filter((s) => {
    const it = ITEM_DB[s.id];
    if (!it) return false;
    if (filter === "all") return true;
    return it.type === filter || it.equipSlot === filter;
  });

  list.innerHTML = rows
    .map((s) => {
      const it = ITEM_DB[s.id];
      const price = s.price;
      const affordable = (p.gold ?? 0) >= price;
      return `
      <div class="shopItem">
        <div class="invIcon">${it.icon}</div>
        <div style="flex:1;">
          <div class="invName">${it.name} ${price === 0 ? `<span class="badge">grátis</span>` : ""}</div>
          <div class="invDesc">${it.desc}</div>
        </div>
        <div class="price">
          <span>🪙 <strong>${price}</strong></span>
          <button class="smallBtn ${affordable ? "smallBtnPrimary" : ""}" onclick="buyItem('${s.id}')">
            Comprar
          </button>
        </div>
      </div>
    `;
    })
    .join("");
}
function buyItem(itemId) {
  if (!invTargetName) return;
  let data = load();
  let p = data.rooms[room][invTargetName];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);

  const shopEntry = SHOP.find((s) => s.id === itemId);
  if (!shopEntry) return;

  const price = shopEntry.price ?? 0;
  const gold = p.gold ?? 0;
  if (gold < price) {
    alert("Ouro insuficiente.");
    return;
  }

  const res = addItemToPlayer(p, itemId);
  if (!res.ok) {
    alert(res.msg || "Não foi possível comprar.");
    return;
  }

  p.gold = gold - price;

  const it = ITEM_DB[itemId];
  if (it && it.equipSlot === "weapon" && !p.equipped.weapon) {
    p.equipped.weapon = itemId;
  }

  recalcFromSheet(p);
  save(data);

  pushAction(
    currentUser,
    `${invTargetName} comprou ${it.icon} ${it.name} por 🪙${price}.`,
  );
  updateArena();
}

/* mini menu inv */
function openItemMenu(evt, itemId, idx) {
  evt.stopPropagation();
  removeMiniMenu();

  const it = ITEM_DB[itemId];
  const anchor = evt.currentTarget;
  const r = anchor.getBoundingClientRect();

  const menu = document.createElement("div");
  menu.className = "miniMenu";
  menu.id = "miniMenu";

  const canEquip = !!it.equipSlot;
  const canUse = !!it.consume;

  menu.innerHTML = `
    <div class="muted">${it.icon} ${it.name}</div>
    ${canEquip ? `<button onclick="menuEquip('${itemId}')">🧷 Equipar</button>` : `<div class="muted">Não equipável</div>`}
    ${canUse ? `<button onclick="menuUse('${itemId}')">🧪 Usar</button>` : `<div class="muted">Não consumível</div>`}
    <button onclick="menuSend('${itemId}')">📦 Enviar para jogador</button>
    <button onclick="menuDrop('${itemId}')">🗑️ Descartar</button>
  `;

  document.body.appendChild(menu);

  const left = Math.min(window.innerWidth - 240, r.left - 170);
  const top = Math.min(window.innerHeight - 220, r.top + 30);

  menu.style.left = left + "px";
  menu.style.top = top + "px";

  setTimeout(() => document.addEventListener("click", removeMiniMenu), 10);
}
function removeMiniMenu() {
  const m = document.getElementById("miniMenu");
  if (m) m.remove();
  document.removeEventListener("click", removeMiniMenu);
}
function menuEquip(itemId) {
  if (!invTargetName) return;
  let data = load();
  const p = data.rooms[room][invTargetName];
  if (!p) return;
  ensurePlayerSchema(p);

  equipItem(p, itemId);
  recalcFromSheet(p);
  save(data);

  const it = ITEM_DB[itemId];
  pushAction(currentUser, `${invTargetName} equipou ${it.icon} ${it.name}.`);

  removeMiniMenu();
  updateArena();
}
function menuUse(itemId) {
  if (!invTargetName) return;
  let data = load();
  const p = data.rooms[room][invTargetName];
  if (!p) return;
  ensurePlayerSchema(p);
  recalcFromSheet(p);

  const it = ITEM_DB[itemId];
  const ok = useConsumable(p, itemId);
  if (!ok.ok) return;

  save(data);
  pushAction(currentUser, `${invTargetName} usou ${it.icon} ${it.name}.`);

  removeMiniMenu();
  updateArena();
}
function menuDrop(itemId) {
  if (!invTargetName) return;
  if (!confirm("Descartar este item?")) return;

  let data = load();
  const p = data.rooms[room][invTargetName];
  if (!p) return;
  ensurePlayerSchema(p);

  const it = ITEM_DB[itemId];
  if (it && it.equipSlot && p.equipped && p.equipped[it.equipSlot] === itemId) {
    p.equipped[it.equipSlot] = null;
  }
  removeItemFromPlayer(p, itemId);
  recalcFromSheet(p);
  save(data);

  removeMiniMenu();
  updateArena();
}
function menuSend(itemId) {
  if (!invTargetName) return;

  let data = load();
  const from = data.rooms[room][invTargetName];
  if (!from) return;

  const names = Object.keys(data.rooms[room]).filter(
    (n) => n !== invTargetName,
  );
  if (names.length === 0) {
    alert("Não há outro jogador na sala.");
    return;
  }

  const targetName = prompt("Enviar para quem?\n" + names.join(", "), names[0]);
  if (!targetName || !data.rooms[room][targetName]) return;

  const to = data.rooms[room][targetName];

  ensurePlayerSchema(from);
  ensurePlayerSchema(to);
  recalcFromSheet(from);
  recalcFromSheet(to);

  if (!(from.inventory || []).includes(itemId)) return;
  if (invCount(to) >= invMax(to)) {
    alert("Inventário do destino está cheio.");
    return;
  }

  const it = ITEM_DB[itemId];
  if (
    it &&
    it.equipSlot &&
    from.equipped &&
    from.equipped[it.equipSlot] === itemId
  ) {
    from.equipped[it.equipSlot] = null;
  }

  removeItemFromPlayer(from, itemId);
  to.inventory.push(itemId);

  recalcFromSheet(from);
  recalcFromSheet(to);
  save(data);

  pushAction(
    currentUser,
    `${invTargetName} entregou ${it.icon} ${it.name} para ${targetName}.`,
  );

  removeMiniMenu();
  updateArena();
}

/* ================= MASTER MODE / SCENE UI ================= */
let isMaster = false;
let paintTool = "floor";
let isPainting = false;

function toggleMasterMode() {
  isMaster = !isMaster;
  const btn = document.getElementById("masterToggle");
  const panel = document.getElementById("scenePanel");
  btn.classList.toggle("on", isMaster);
  btn.textContent = isMaster ? "🛠️ Mestre: ON" : "🛠️ Mestre: OFF";
  panel.classList.toggle("on", isMaster);

  if (isMaster) {
    syncSceneUIFromStorage();
    attachPaintHandlers();
  } else {
    detachPaintHandlers();
    clearPaintHighlights();
  }
}

function setTool(tool) {
  paintTool = tool;
  document
    .getElementById("toolFloor")
    .classList.toggle("active", tool === "floor");
  document
    .getElementById("toolWall")
    .classList.toggle("active", tool === "wall");
  document
    .getElementById("toolVoid")
    .classList.toggle("active", tool === "void");
}

function syncSceneUIFromStorage() {
  ensureScene();
  const s = load().scenes[room];
  document.getElementById("bgUrl").value = s.bgUrl || "";
  document.getElementById("bgScale").value = s.bgScale;
  document.getElementById("bgOpacity").value = s.bgOpacity;
  document.getElementById("bgX").value = s.bgX;
  document.getElementById("bgY").value = s.bgY;
  applySceneCSS();
}

function bindSceneInputs() {
  const bgUrl = document.getElementById("bgUrl");
  const bgScale = document.getElementById("bgScale");
  const bgOpacity = document.getElementById("bgOpacity");
  const bgX = document.getElementById("bgX");
  const bgY = document.getElementById("bgY");
  const bgFile = document.getElementById("bgFile");

  bgUrl.addEventListener("change", () => {
    let data = load();
    data.scenes[room].bgUrl = bgUrl.value.trim();
    save(data);
    applySceneCSS();
  });

  function upd() {
    let data = load();
    const s = data.scenes[room];
    s.bgScale = parseInt(bgScale.value, 10);
    s.bgOpacity = parseInt(bgOpacity.value, 10);
    s.bgX = parseInt(bgX.value, 10);
    s.bgY = parseInt(bgY.value, 10);
    save(data);
    applySceneCSS();
  }
  bgScale.addEventListener("input", upd);
  bgOpacity.addEventListener("input", upd);
  bgX.addEventListener("input", upd);
  bgY.addEventListener("input", upd);

  bgFile.addEventListener("change", () => {
    const file = bgFile.files && bgFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data = load();
      data.scenes[room].bgUrl = reader.result; // dataURL
      save(data);
      document.getElementById("bgUrl").value = "";
      applySceneCSS();
    };
    reader.readAsDataURL(file);
  });
}
bindSceneInputs();

function fillAll(type) {
  let data = load();
  const s = data.scenes[room];
  s.tiles = new Array(s.cols * s.rows).fill(type);
  save(data);
  updateArena();
}

function clearScene() {
  if (!confirm("Limpar cena? (tiles e background)")) return;
  let data = load();
  data.scenes[room] = structuredClone(DEFAULT_SCENE);
  save(data);
  createGrid();
  updateArena();
  syncSceneUIFromStorage();
}

/* pintura de tiles */
function attachPaintHandlers() {
  arena.addEventListener("mousedown", onPaintStart);
  arena.addEventListener("mousemove", onPaintMove);
  window.addEventListener("mouseup", onPaintEnd);
  arena.addEventListener("contextmenu", (e) => e.preventDefault());
}
function detachPaintHandlers() {
  arena.removeEventListener("mousedown", onPaintStart);
  arena.removeEventListener("mousemove", onPaintMove);
  window.removeEventListener("mouseup", onPaintEnd);
}
function onPaintStart(e) {
  if (!isMaster) return;
  const cell = e.target.closest(".cell");
  if (!cell) return;
  isPainting = true;
  paintAtEvent(e, cell);
}
function onPaintMove(e) {
  if (!isMaster || !isPainting) return;
  const cell = e.target.closest(".cell");
  if (!cell) return;
  paintAtEvent(e, cell);
}
function onPaintEnd() {
  if (!isMaster) return;
  isPainting = false;
  clearPaintHighlights();
}

function effectiveTool(e) {
  if (e.altKey) return "void";
  if (e.shiftKey) return "wall";
  return paintTool || "floor";
}
function paintAtEvent(e, cell) {
  const x = parseInt(cell.dataset.x, 10);
  const y = parseInt(cell.dataset.y, 10);
  const t = effectiveTool(e);

  setTile(x, y, t);

  // highlight leve
  cell.classList.remove("paint-floor", "paint-wall", "paint-void");
  cell.classList.add("paint-" + t);

  updateArena();
}

function clearPaintHighlights() {
  document.querySelectorAll(".cell").forEach((c) => {
    c.classList.remove("paint-floor", "paint-wall", "paint-void");
  });
}

/* ================= INIT ================= */
createGrid();
applySceneCSS();
updateArena();
updateChat();

/* realtime local */
window.addEventListener("storage", () => {
  ensureScene();
  createGrid();
  updateArena();
  updateChat();
});

/* ================= TABLE: add back ================= */
function addBackToTable(name) {
  let data = load();
  let p = data.rooms[room][name];
  if (!p) return;
  ensurePlayerSchema(p);

  const s = data.scenes[room];
  const found = findNearestFloor(
    Math.floor(s.cols / 2),
    Math.floor(s.rows / 2),
  );
  if (found) {
    p.x = found.x;
    p.y = found.y;
  }
  p.onTable = true;

  save(data);
  updateArena();
}
