/* ================= CONFIG ================= */
const STORAGE_KEY = "rpgquest_v2_scene";
const LAST_LOGIN_KEY = "rpgquest_last_login";
const LAST_AVATAR_KEY = "rpgquest_last_avatar";
const AUTH_STORAGE_KEY = "rpgquest_auth_v1";
const DEV_AUTH_BYPASS_ENABLED = true;
const DEV_AUTH_USER = {
  email: "teste@saramaz.local",
  token: "dev-token-saramazquest",
  playerName: "Mestre 1",
  race: "Humano",
  className: "Mago",
  avatar: createIconAvatar("assets/characters/arqueira-drow.svg", "🧝", "Mestre 1"),
};
let room = "arena";
let currentUser = "Jogador";
let currentAvatar = "🧙";
let currentAccountEmail = "";
let pendingCharacterSetup = null;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function accountKeyByEmail(email) {
  return `acc_${normalizeEmail(email)}`;
}

function loadAuthState() {
  const raw = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "{}");
  if (!raw.accounts || typeof raw.accounts !== "object") raw.accounts = {};
  raw.lastSessionEmail = normalizeEmail(raw.lastSessionEmail);
  return raw;
}

function saveAuthState(auth) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

function getLoggedAccount() {
  const auth = loadAuthState();
  const email = normalizeEmail(auth.lastSessionEmail);
  if (!email) return null;
  const acc = auth.accounts[accountKeyByEmail(email)];
  if (!acc) return null;
  return { email, account: acc };
}

function ensureDevSpellbook(player) {
  if (!player || !Array.isArray(player.customSpells) || player.customSpells.length > 0) return;
  player.customSpells = [
    {
      id: "dev_arcane_burst",
      icon: "✨",
      name: "Rajada Arcana",
      level: 1,
      creatorLevel: Math.max(1, parseInt(player.level, 10) || 1),
      effects: [{ type: "dano", damageDice: "2d6", damageType: "arcano", area: "alvo único" }],
      pointCost: 5,
      castingTime: "1 ação",
      range: "18m",
      components: ["V", "S"],
      description: "Uma descarga arcana rápida para testes de combate.",
      rules: { usesSpellSlots: false, preparedType: "known" },
    },
    {
      id: "dev_healing_tide",
      icon: "💚",
      name: "Maré de Cura",
      level: 1,
      creatorLevel: Math.max(1, parseInt(player.level, 10) || 1),
      effects: [{ type: "cura", healDice: "2d8" }],
      pointCost: 5,
      castingTime: "1 ação bônus",
      range: "toque",
      components: ["V"],
      description: "Recupera pontos de vida para facilitar os testes da interface.",
      rules: { usesSpellSlots: false, preparedType: "known" },
    },
  ];
}

function seedDevBypassSession() {
  if (!DEV_AUTH_BYPASS_ENABLED) return null;

  const email = normalizeEmail(DEV_AUTH_USER.email);
  const auth = loadAuthState();
  const key = accountKeyByEmail(email);
  auth.accounts[key] = {
    email,
    password: DEV_AUTH_USER.token,
    token: DEV_AUTH_USER.token,
    displayName: "Usuário de teste",
    playerName: DEV_AUTH_USER.playerName,
    avatar: normalizeAvatar(DEV_AUTH_USER.avatar),
    createdAt: auth.accounts[key]?.createdAt || Date.now(),
  };
  auth.lastSessionEmail = email;
  saveAuthState(auth);

  currentAccountEmail = email;
  currentUser = DEV_AUTH_USER.playerName;
  currentAvatar = normalizeAvatar(DEV_AUTH_USER.avatar);

  ensureCurrentUserRecord({
    race: DEV_AUTH_USER.race,
    className: DEV_AUTH_USER.className,
    avatar: DEV_AUTH_USER.avatar,
    owner: email,
  });

  const state = load();
  const player = state.rooms?.[room]?.[DEV_AUTH_USER.playerName];
  if (player) {
    ensurePlayerSchema(player);
    player.owner = email;
    player.onTable = true;
    ensureDevSpellbook(player);
    recalcFromSheet(player);
    save(state);
  }

  return { email, account: auth.accounts[key] };
}

function findOwnedCharacterEntry(email = currentAccountEmail) {
  const normalizedOwner = normalizeEmail(email);
  if (!normalizedOwner) return null;
  const players = load().rooms?.[room] || {};
  for (const [name, player] of Object.entries(players)) {
    if (normalizeEmail(player?.owner || "") === normalizedOwner) {
      return { name, player };
    }
  }
  return null;
}

const START_AVATARS = [
  { type: "emoji", value: "🧙" },
  { type: "emoji", value: "⚔️" },
  { type: "emoji", value: "🏹" },
  { type: "emoji", value: "🛡️" },
  { type: "emoji", value: "🧝" },
  { type: "emoji", value: "🧛" },
];

const CHARACTER_TEMPLATES = [
  {
    id: "barbaro-lobo",
    label: "Bárbaro Lobo",
    race: "Humano",
    className: "Guerreiro",
    emoji: "🐺",
    tokenUrl: "assets/characters/barbaro-lobo.svg",
  },
  {
    id: "cavaleiro-drow",
    label: "Cavaleiro Drow",
    race: "Elfo",
    className: "Guerreiro",
    emoji: "🛡️",
    tokenUrl: "assets/characters/cavaleiro-drow.svg",
  },
  {
    id: "arqueira-drow",
    label: "Arqueira Drow",
    race: "Elfo",
    className: "Arqueiro",
    emoji: "🏹",
    tokenUrl: "assets/characters/arqueira-drow.svg",
  },
  {
    id: "ladino-reptiliano",
    label: "Ladino Reptiliano",
    race: "Anao",
    className: "Arqueiro",
    emoji: "🦎",
    tokenUrl: "assets/characters/ladino-reptiliano.svg",
  },
];
const DEFAULT_SPRITE_URL = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/25.gif";

function isSpriteAvatar(avatar) {
  return !!avatar && typeof avatar === "object" && avatar.type === "sprite" && typeof avatar.url === "string";
}

function isIconAvatar(avatar) {
  return !!avatar && typeof avatar === "object" && avatar.type === "icon" && typeof avatar.url === "string";
}

function getAvatarEmoji(avatar) {
  if (isSpriteAvatar(avatar) || isIconAvatar(avatar)) return String(avatar.fallback || "🧙");
  return String(avatar || "🧙").trim() || "🧙";
}

function getAvatarSelectionKey(avatar) {
  if (isSpriteAvatar(avatar) || isIconAvatar(avatar)) return String(avatar.url || "");
  return getAvatarEmoji(avatar);
}

function normalizeAvatar(avatar) {
  if (isSpriteAvatar(avatar)) {
    return {
      type: "sprite",
      url: String(avatar.url || DEFAULT_SPRITE_URL).trim() || DEFAULT_SPRITE_URL,
      fallback: getAvatarEmoji(avatar),
    };
  }
  if (isIconAvatar(avatar)) {
    return {
      type: "icon",
      url: String(avatar.url || "").trim(),
      fallback: getAvatarEmoji(avatar),
      label: String(avatar.label || "Personagem").trim() || "Personagem",
    };
  }
  return getAvatarEmoji(avatar);
}

function createSpriteAvatar(fallbackEmoji = "🧙") {
  return {
    type: "sprite",
    url: DEFAULT_SPRITE_URL,
    fallback: getAvatarEmoji(fallbackEmoji),
  };
}

function createIconAvatar(url, fallbackEmoji = "🧙", label = "Personagem") {
  return {
    type: "icon",
    url: String(url || "").trim(),
    fallback: getAvatarEmoji(fallbackEmoji),
    label: String(label || "Personagem").trim() || "Personagem",
  };
}

const QUICK_REACTIONS = ["👍", "😂", "🔥", "❤️", "😮"];
const PICKER_EMOJIS = ["😀", "😁", "😂", "🤣", "🙂", "😉", "😎", "🤔", "😮", "😢", "😡", "❤️", "🔥", "👏", "🎲", "⚔️", "🛡️", "✨"];
let pendingReplyId = null;
let chatSenderKey = "player";
let chatContextCleanup = null;

function initAuth() {
  const overlay = document.getElementById("authOverlay");
  if (!overlay) return;

  const emailInput = document.getElementById("authEmail");
  const passInput = document.getElementById("authPassword");
  const submitBtn = document.getElementById("authSubmitBtn");
  const msg = document.getElementById("authMessage");
  const loginTab = document.getElementById("authLoginTab");
  const registerTab = document.getElementById("authRegisterTab");

  let mode = "login";

  const setMode = (nextMode) => {
    mode = nextMode;
    loginTab.classList.toggle("active", mode === "login");
    registerTab.classList.toggle("active", mode === "register");
    submitBtn.textContent = mode === "login" ? "Entrar" : "Criar conta";
    passInput.autocomplete = mode === "login" ? "current-password" : "new-password";
    msg.textContent = "";
  };

  const login = (email, account) => {
    const preferredName = String(account.playerName || "").trim() || String(account.displayName || "").trim() || "Jogador";
    currentAccountEmail = email;
    currentUser = preferredName;
    currentAvatar = normalizeAvatar(account.avatar || "🧙");
    localStorage.setItem(LAST_LOGIN_KEY, currentUser);
    localStorage.setItem(LAST_AVATAR_KEY, JSON.stringify(currentAvatar));
    document.getElementById("meName").textContent = currentUser;

    const auth = loadAuthState();
    auth.lastSessionEmail = email;
    saveAuthState(auth);

    overlay.classList.add("hidden");
    const shouldOpenCreator = !findOwnedCharacterEntry(email);
    initCharacterSetup(shouldOpenCreator);
    updateArena();
    updateChat();
  };

  loginTab.onclick = () => setMode("login");
  registerTab.onclick = () => setMode("register");

  submitBtn.onclick = () => {
    const email = normalizeEmail(emailInput.value);
    const password = String(passInput.value || "");

    if (!email.includes("@") || !email.includes(".")) {
      msg.textContent = "Informe um e-mail válido.";
      return;
    }
    if (password.length < 6) {
      msg.textContent = "A senha precisa ter pelo menos 6 caracteres.";
      return;
    }

    const auth = loadAuthState();
    const key = accountKeyByEmail(email);
    const existing = auth.accounts[key];

    if (mode === "register") {
      if (existing) {
        msg.textContent = "Esse e-mail já está cadastrado. Faça login.";
        return;
      }
      auth.accounts[key] = {
        email,
        password,
        displayName: email.split("@")[0],
        playerName: "",
        avatar: normalizeAvatar("🧙"),
        createdAt: Date.now(),
      };
      auth.lastSessionEmail = email;
      saveAuthState(auth);
      msg.textContent = "Conta criada com sucesso!";
      login(email, auth.accounts[key]);
      return;
    }

    if (!existing || existing.password !== password) {
      msg.textContent = "E-mail ou senha inválidos.";
      return;
    }

    login(email, existing);
  };

  const devSession = seedDevBypassSession();
  const session = devSession || getLoggedAccount();
  if (session) {
    login(session.email, session.account);
  } else {
    overlay.classList.remove("hidden");
    const remembered = normalizeEmail(localStorage.getItem("rpgquest_last_email") || "");
    emailInput.value = remembered;
    setMode("login");
  }

  emailInput.addEventListener("change", () => {
    localStorage.setItem("rpgquest_last_email", normalizeEmail(emailInput.value));
  });
}

function initCharacterSetup(forceOpen = false) {
  const overlay = document.getElementById("characterSetup");
  if (!overlay) return;

  const nameInput = document.getElementById("setupName");
  const raceWrap = document.getElementById("setupRaceOptions");
  const classWrap = document.getElementById("setupClassOptions");
  const avatarWrap = document.getElementById("setupAvatarOptions");
  const startBtn = document.getElementById("setupStartBtn");

  if (!currentAccountEmail) {
    overlay.classList.add("hidden");
    return;
  }

  const raceOptions = Object.keys(RACES);
  const classOptions = Object.keys(CLASSES);
  const ownedEntry = findOwnedCharacterEntry(currentAccountEmail);

  if (ownedEntry) {
    currentUser = ownedEntry.name;
    currentAvatar = normalizeAvatar(ownedEntry.player.avatar || currentAvatar);
    document.getElementById("meName").textContent = currentUser;

    if (!forceOpen) {
      overlay.classList.add("hidden");
      return;
    }

    alert("Você já possui um personagem criado nesta sala.");
    overlay.classList.add("hidden");
    return;
  }

  nameInput.value = currentUser;

  let selectedRace = raceOptions[0] || "Humano";
  let selectedClass = classOptions[0] || "Guerreiro";
  let selectedTemplateId = CHARACTER_TEMPLATES[0]?.id || "";
  let selectedAvatar = normalizeAvatar(currentAvatar);

  const resolveTemplate = () => CHARACTER_TEMPLATES.find((template) => template.id === selectedTemplateId) || null;

  const resolveAvatarFromTemplate = () => {
    const selectedTemplate = resolveTemplate();
    if (selectedTemplate) return createIconAvatar(selectedTemplate.tokenUrl, selectedTemplate.emoji, selectedTemplate.label);
    return getAvatarEmoji(selectedAvatar);
  };

  selectedAvatar = resolveAvatarFromTemplate();

  function renderRaceButtons() {
    raceWrap.innerHTML = "";
    raceOptions.forEach((raceName) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "setupChoiceBtn" + (selectedRace === raceName ? " active" : "");
      btn.textContent = raceName;
      btn.onclick = () => {
        selectedRace = raceName;
        selectedTemplateId = "";
        renderRaceButtons();
      };
      raceWrap.appendChild(btn);
    });
  }

  function renderClassButtons() {
    classWrap.innerHTML = "";
    classOptions.forEach((className) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "setupChoiceBtn" + (selectedClass === className ? " active" : "");
      btn.textContent = className;
      btn.onclick = () => {
        selectedClass = className;
        selectedTemplateId = "";
        renderClassButtons();
      };
      classWrap.appendChild(btn);
    });
  }

  function renderAvatars() {
    avatarWrap.innerHTML = "";
    START_AVATARS.forEach((avatarOption) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "setupAvatarBtn" + (getAvatarSelectionKey(selectedAvatar) === getAvatarSelectionKey(avatarOption.value) ? " active" : "");
      btn.textContent = avatarOption.value;
      btn.onclick = () => {
        selectedTemplateId = "";
        selectedAvatar = avatarOption.value;
        renderAvatars();
      };
      avatarWrap.appendChild(btn);
    });
  }

  renderRaceButtons();
  renderClassButtons();
  renderAvatars();

  if (!forceOpen) {
    overlay.classList.add("hidden");
    return;
  }
  overlay.classList.remove("hidden");

  const finishSetup = ({
    chosenName = String(nameInput.value || "").trim() || "Jogador",
    chosenRace = selectedRace,
    chosenClass = selectedClass,
    chosenAvatar = selectedAvatar || "🧙",
  } = {}) => {
    const lockedOwner = findOwnedCharacterEntry(currentAccountEmail);
    if (lockedOwner) {
      alert("Você já possui um personagem criado nesta sala.");
      overlay.classList.add("hidden");
      return;
    }

    const players = load().rooms?.[room] || {};
    const normalizedName = chosenName.trim() || "Jogador";
    const existingByName = players[normalizedName];
    if (existingByName && normalizeEmail(existingByName.owner || "") !== normalizeEmail(currentAccountEmail)) {
      alert("Esse nome já está em uso por outro jogador. Escolha outro nome.");
      return;
    }

    currentUser = normalizedName;
    currentAvatar = normalizeAvatar(chosenAvatar);
    pendingCharacterSetup = {
      race: chosenRace,
      className: chosenClass,
      avatar: currentAvatar,
      owner: normalizeEmail(currentAccountEmail),
    };

    localStorage.setItem(LAST_LOGIN_KEY, currentUser);
    localStorage.setItem(LAST_AVATAR_KEY, JSON.stringify(currentAvatar));
    document.getElementById("meName").textContent = currentUser;

    const auth = loadAuthState();
    if (currentAccountEmail) {
      const key = accountKeyByEmail(currentAccountEmail);
      if (auth.accounts[key]) {
        auth.accounts[key].playerName = currentUser;
        auth.accounts[key].avatar = currentAvatar;
        saveAuthState(auth);
      }
    }

    ensureCurrentUserRecord({
      race: chosenRace,
      className: chosenClass,
      avatar: currentAvatar,
      owner: normalizeEmail(currentAccountEmail),
    });
    updateArena();
    updateChat();
    overlay.classList.add("hidden");
  };

  startBtn.onclick = () => finishSetup();
}

window.openCharacterCreator = function openCharacterCreator() {
  initCharacterSetup(true);
};


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
  mapZoom: 1,
  gridStyle: "square", // square | dots
  gridOpacity: 55,
  gridLine: 1,
  layers: [], // imagens posicionáveis por camada: map | objects | foreground
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

function makeRuntimeItemId(baseId) {
  return `${baseId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/* ================= ATRIBUTOS / PERÍCIAS (5e - mods) ================= */
const ATTRIBUTES = [
  { id: "str", name: "Força", short: "FOR" },
  { id: "dex", name: "Destreza", short: "DES" },
  { id: "con", name: "Constituição", short: "CON" },
  { id: "int", name: "Inteligência", short: "INT" },
  { id: "wis", name: "Sabedoria", short: "SAB" },
  { id: "cha", name: "Carisma", short: "CAR" },
];

const ATTRIBUTE_POINT_BUY = [
  { score: 8, cost: 0, mod: -1 },
  { score: 9, cost: 1, mod: -1 },
  { score: 10, cost: 2, mod: 0 },
  { score: 11, cost: 3, mod: 0 },
  { score: 12, cost: 4, mod: 1 },
  { score: 13, cost: 5, mod: 1 },
  { score: 14, cost: 7, mod: 2 },
  { score: 15, cost: 9, mod: 2 },
];
const POINT_BUY_BUDGET = 27;

const SKILLS = [
  { id: "athletics", name: "Atletismo", ability: "str" },
  { id: "acrobatics", name: "Acrobacia", ability: "dex" },
  { id: "sleightOfHand", name: "Prestidigitação", ability: "dex" },
  { id: "stealth", name: "Furtividade", ability: "dex" },
  { id: "arcana", name: "Arcanismo", ability: "int" },
  { id: "history", name: "História", ability: "int" },
  { id: "investigation", name: "Investigação", ability: "int" },
  { id: "nature", name: "Natureza", ability: "int" },
  { id: "religion", name: "Religião", ability: "int" },
  { id: "animalHandling", name: "Lidar com Animais", ability: "wis" },
  { id: "insight", name: "Intuição", ability: "wis" },
  { id: "medicine", name: "Medicina", ability: "wis" },
  { id: "perception", name: "Percepção", ability: "wis" },
  { id: "survival", name: "Sobrevivência", ability: "wis" },
  { id: "deception", name: "Enganação", ability: "cha" },
  { id: "intimidation", name: "Intimidação", ability: "cha" },
  { id: "performance", name: "Atuação", ability: "cha" },
  { id: "persuasion", name: "Persuasão", ability: "cha" },
];

/* ================= BANCO: RAÇAS / CLASSES ================= */
const LEGACY_RACES = {
  Humano: {
    abilityBonuses: [
      { ability: "str", modDelta: 1 },
      { ability: "dex", modDelta: 1 },
      { ability: "con", modDelta: 1 },
      { ability: "int", modDelta: 1 },
      { ability: "wis", modDelta: 1 },
      { ability: "cha", modDelta: 1 },
    ],
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
    abilityBonuses: [
      { ability: "dex", modDelta: 2 },
      { ability: "wis", modDelta: 1 },
    ],
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
    abilityBonuses: [
      { ability: "str", modDelta: 2 },
      { ability: "con", modDelta: 1 },
    ],
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

const LEGACY_CLASSES = {
  Guerreiro: {
    primaryAbilities: ["str", "con"],
    savingThrowProficiencies: ["str", "con"],
    skillChoices: {
      choose: 2,
      from: ["athletics", "animalHandling", "intimidation", "survival", "perception"],
    },
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
    primaryAbilities: ["int"],
    savingThrowProficiencies: ["int", "wis"],
    skillChoices: {
      choose: 2,
      from: ["arcana", "history", "insight", "investigation", "medicine", "religion"],
    },
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
    primaryAbilities: ["dex", "wis"],
    savingThrowProficiencies: ["dex", "wis"],
    skillChoices: {
      choose: 3,
      from: ["acrobatics", "athletics", "nature", "perception", "stealth", "survival"],
    },
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

let RACES = structuredClone(LEGACY_RACES);
let CLASSES = structuredClone(LEGACY_CLASSES);

const ABILITY_ID_MAP = {
  forca: "str",
  força: "str",
  str: "str",
  destreza: "dex",
  dex: "dex",
  constituicao: "con",
  constituição: "con",
  con: "con",
  inteligencia: "int",
  inteligência: "int",
  int: "int",
  sabedoria: "wis",
  wis: "wis",
  carisma: "cha",
  cha: "cha",
};

function normalizeAbilityId(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase();
  return ABILITY_ID_MAP[key] || key;
}

function normalizeAbilityEntry(entry, idx, sourceType, sourceName) {
  const icon = String(entry?.icon || (sourceType === "race" ? "🧬" : "⚙️")).trim() || "✨";
  const name = String(entry?.name || `Habilidade ${idx + 1}`).trim();
  return {
    id: String(entry?.id || `${sourceType}_${sourceName}_${idx}`),
    icon,
    name,
    desc: String(entry?.desc || "Sem descrição.").trim(),
    manaCost: parseInt(entry?.manaCost || 0, 10) || 0,
    passive: Boolean(entry?.passive),
    sourceType,
    sourceName,
    level: parseInt(entry?.level, 10) || 1,
  };
}

function normalizeRaceDatabase(raw = {}) {
  const normalized = {};
  Object.entries(raw || {}).forEach(([raceName, raceData]) => {
    const safeRaceName = String(raceName || "").trim();
    if (!safeRaceName) return;

    normalized[safeRaceName] = {
      id: String(raceData?.id || safeRaceName.toLowerCase()),
      parent: raceData?.parent ? String(raceData.parent) : undefined,
      dna: raceData?.dna && typeof raceData.dna === "object" ? raceData.dna : null,
      abilityBonuses: Array.isArray(raceData?.abilityBonuses)
        ? raceData.abilityBonuses
            .map((bonus) => ({
              ability: normalizeAbilityId(bonus?.ability),
              modDelta: parseInt(bonus?.modDelta || 0, 10) || 0,
            }))
            .filter((bonus) => ATTRIBUTES.some((attr) => attr.id === bonus.ability))
        : [],
      abilities: Array.isArray(raceData?.abilities)
        ? raceData.abilities.map((ability, idx) => normalizeAbilityEntry(ability, idx, "race", safeRaceName))
        : [],
    };
  });
  return normalized;
}

function normalizeClassDatabase(raw = {}) {
  const normalized = {};
  Object.entries(raw || {}).forEach(([className, classData]) => {
    const safeClassName = String(className || "").trim();
    if (!safeClassName) return;

    const hitDie = String(classData?.hitDie || "").trim().toLowerCase();
    const hpMode = classData?.hpMode && typeof classData.hpMode === "object" ? classData.hpMode : null;
    const magicPoints = classData?.magicPoints && typeof classData.magicPoints === "object" ? classData.magicPoints : { enabled: false };
    const magicPointTable = classData?.magicPointTable && typeof classData.magicPointTable === "object" ? classData.magicPointTable : null;

    normalized[safeClassName] = {
      id: String(classData?.id || safeClassName.toLowerCase()),
      hitDie,
      hpMode,
      spellProgression: String(classData?.spellProgression || "none"),
      magicPoints,
      magicPointTable,
      primaryAbilities: Array.isArray(classData?.primaryAbilities)
        ? classData.primaryAbilities.map(normalizeAbilityId).filter((ability) => ATTRIBUTES.some((attr) => attr.id === ability))
        : [],
      savingThrowProficiencies: Array.isArray(classData?.savingThrowProficiencies)
        ? classData.savingThrowProficiencies
            .map(normalizeAbilityId)
            .filter((ability) => ATTRIBUTES.some((attr) => attr.id === ability))
        : [],
      skillChoices: classData?.skillChoices || null,
      hpMod: parseInt(classData?.hpMod || 0, 10) || 0,
      manaMod: parseInt(classData?.manaMod || 0, 10) || 0,
      abilities: Array.isArray(classData?.abilities)
        ? classData.abilities.map((ability, idx) => normalizeAbilityEntry(ability, idx, "class", safeClassName))
        : [],
    };
  });
  return normalized;
}


function parseHitDieSize(hitDie) {
  const raw = String(hitDie || "").toLowerCase().trim();
  const match = raw.match(/^d(\d+)$/);
  if (!match) return 10;
  const size = parseInt(match[1], 10);
  return Number.isFinite(size) && size > 0 ? size : 10;
}

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

function ensureHpRollsForCharacter(p, level, hitDieSize, forceReroll = false) {
  if (!Array.isArray(p.hpRolls) || forceReroll) p.hpRolls = [];
  if (p.hpRollDie !== hitDieSize || forceReroll) {
    p.hpRollDie = hitDieSize;
    p.hpRolls = [];
  }

  while (p.hpRolls.length < level) {
    const idx = p.hpRolls.length + 1;
    const seed = `${p.owner || "anon"}|${p.class || "class"}|${p.race || "race"}|${p.name || "pc"}|${idx}|d${hitDieSize}`;
    p.hpRolls.push(rollDeterministicD(seed, hitDieSize));
  }

  if (p.hpRolls.length > level) p.hpRolls = p.hpRolls.slice(0, level);
}

function computeHpFromRules(p, cls, level, conMod) {
  const hitDieSize = parseHitDieSize(cls?.hitDie || "d10");
  const safeLevel = Math.max(1, parseInt(level, 10) || 1);
  const hpPerLevel = hitDieSize + (parseInt(conMod, 10) || 0);
  return Math.max(1, hpPerLevel * safeLevel);
}

function computeMagicPointsFromRules(cls, level) {
  const cfg = cls?.magicPoints || { enabled: false };
  if (!cfg.enabled) return 0;

  const startsAtLevel = Math.max(1, parseInt(cfg.starts_at_level, 10) || 1);
  if (level < startsAtLevel) return 0;

  const table = cls?.magicPointTable || null;
  if (!table) return 0;

  const base = parseInt(table[String(level)], 10) || 0;
  const multiplier = Number.isFinite(Number(cfg.multiplier)) ? Number(cfg.multiplier) : 1;
  return Math.max(0, Math.floor(base * multiplier));
}

function normalizeMulticlassEntries(p) {
  const fallbackClass = String(p?.class || Object.keys(CLASSES)[0] || "Guerreiro");
  const fallbackLevel = Math.max(1, parseInt(p?.level, 10) || 1);
  const raw = Array.isArray(p?.classes) ? p.classes : [{ classId: fallbackClass, level: fallbackLevel }];

  const normalized = raw
    .map((entry) => ({
      classId: String(entry?.classId || entry?.class_id || fallbackClass),
      level: Math.max(1, parseInt(entry?.level, 10) || 1),
    }))
    .filter((entry) => CLASSES[entry.classId]);

  return normalized.length ? normalized : [{ classId: fallbackClass, level: fallbackLevel }];
}

function getTotalClassLevel(classEntries) {
  return classEntries.reduce((sum, entry) => sum + Math.max(1, parseInt(entry.level, 10) || 1), 0);
}

function ensureHpRollsByClass(p, classEntries) {
  if (!Array.isArray(p.hpRollsByClass)) p.hpRollsByClass = [];
  p.hpRollsByClass = classEntries.map((entry) => {
    const cls = CLASSES[entry.classId] || null;
    const hitDieSize = parseHitDieSize(cls?.hitDie || "d10");
    const safeLevel = Math.max(1, parseInt(entry.level, 10) || 1);
    const existing = p.hpRollsByClass.find((rollEntry) => rollEntry?.classId === entry.classId && parseInt(rollEntry.hitDieSize, 10) === hitDieSize);
    const rolls = Array.isArray(existing?.rolls) ? [...existing.rolls] : [];

    while (rolls.length < safeLevel) {
      const idx = rolls.length + 1;
      const seed = `${p.owner || "anon"}|${entry.classId}|${p.race || "race"}|${p.name || "pc"}|${idx}|d${hitDieSize}`;
      rolls.push(rollDeterministicD(seed, hitDieSize));
    }

    return {
      classId: entry.classId,
      level: safeLevel,
      hitDieSize,
      rolls: rolls.slice(0, safeLevel),
    };
  });

  return p.hpRollsByClass;
}

function computeMulticlassHpFromRules(p, classEntries, conMod) {
  const rollEntries = ensureHpRollsByClass(p, classEntries);
  const hpRollsTotal = rollEntries.reduce((sum, entry) => sum + entry.rolls.reduce((acc, value) => acc + value, 0), 0);
  const totalLevel = getTotalClassLevel(classEntries);
  return Math.max(1, hpRollsTotal + totalLevel * (parseInt(conMod, 10) || 0));
}

function computeMulticlassMagicPointsFromRules(classEntries) {
  return classEntries.reduce((sum, entry) => {
    const cls = CLASSES[entry.classId] || null;
    return sum + computeMagicPointsFromRules(cls, entry.level);
  }, 0);
}

async function loadRpgDatabases() {
  try {
    const [racesResp, classesResp] = await Promise.all([
      fetch("data/generated/races.db.json", { cache: "no-store" }),
      fetch("data/generated/classes.db.json", { cache: "no-store" }),
    ]);
    if (!racesResp.ok || !classesResp.ok) return;

    const [racesRaw, classesRaw] = await Promise.all([racesResp.json(), classesResp.json()]);
    const racesFromDb = normalizeRaceDatabase(racesRaw);
    const classesFromDb = normalizeClassDatabase(classesRaw);
    if (Object.keys(racesFromDb).length) RACES = racesFromDb;
    if (Object.keys(classesFromDb).length) CLASSES = classesFromDb;
  } catch (_) {
    // fallback para banco legado local
  }
}


const BACKGROUNDS = {
  Nenhum: {
    abilityBonuses: [],
    skillProficiencies: [],
  },
  Sabio: {
    abilityBonuses: [{ ability: "int", modDelta: 1 }],
    skillProficiencies: ["arcana", "history"],
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


  leather_armor: {
    name: "Armadura de Couro",
    icon: "🥋",
    type: "armor",
    equipSlot: "armor",
    desc: "Defesa base 11 (armadura leve).",
    mods: { defense: +1 },
    stats: { category: "light", baseArmor: 11 },
  },
  chainmail: {
    name: "Cota de Malha",
    icon: "⛓️",
    type: "armor",
    equipSlot: "armor",
    desc: "Defesa base 12 (armadura média, DES máx +2).",
    mods: { defense: +2 },
    stats: { category: "medium", baseArmor: 12, dexCap: 2 },
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

};
const SHOP_TABS = [
  { id: "taberna", label: "Taberna" },
  { id: "arsenal", label: "Arsenal" },
  { id: "ferreiro", label: "Ferreiro" },
];
const SHOP_DB = {
  taberna: { shopId: "taberna", shopName: "Taberna & Suprimentos", items: [] },
  arsenal: { shopId: "arsenal", shopName: "Arsenal", items: [] },
  ferreiro: { shopId: "ferreiro", shopName: "Ferreiro", items: [] },
};
const PROFESSION_XP_PER_LEVEL = 100;
const MAX_PRODUCTION_PROFESSIONS = 2;
const PROFESSIONS_DB = {
  professions: [
    { id: "culinaria", nome: "Culinária", descricao: "Prepara refeições e banquetes.", ui: { cor_hex: "#d97706" }, actions: ["coletar", "craftar", "vender"] },
    { id: "alquimia", nome: "Alquimia", descricao: "Coleta ervas e prepara poções/elixires.", ui: { cor_hex: "#059669" }, actions: ["coletar", "craftar", "vender"] },
    { id: "ferraria", nome: "Ferraria", descricao: "Forja armas e armaduras.", ui: { cor_hex: "#64748b" }, actions: ["coletar", "craftar", "vender"] },
    { id: "mercador", nome: "Mercador", descricao: "Gerencia a loja do jogador.", ui: { cor_hex: "#2563eb" }, actions: ["vender", "gerenciar_loja"] },
  ],
  reagents: [
    { id: "erva_comum", nome: "Erva Comum", categoria: "herbal", raridade: "comum", stack_max: 99, valor_venda_gp: 1 },
    { id: "erva_rara", nome: "Erva Rara", categoria: "herbal", raridade: "raro", stack_max: 99, valor_venda_gp: 3 },
    { id: "carne_selvagem", nome: "Carne Selvagem", categoria: "culinaria", raridade: "comum", stack_max: 99, valor_venda_gp: 2 },
    { id: "grao_fino", nome: "Grão Fino", categoria: "culinaria", raridade: "incomum", stack_max: 99, valor_venda_gp: 2 },
    { id: "minerio_ferro", nome: "Minério de Ferro", categoria: "metal", raridade: "comum", stack_max: 99, valor_venda_gp: 2 },
    { id: "minerio_aco", nome: "Minério de Aço", categoria: "metal", raridade: "raro", stack_max: 99, valor_venda_gp: 4 },
  ],
  recipes: [
    { id: "cul_refeicao_simples", profissao_id: "culinaria", nome: "Refeição Simples", nivel_profissao_min: 1, tempo_dias: 1, reagentes: [{ id: "carne_selvagem", qtd: 1 }], output: { type: "item", item_id: "refeicao_simples", qtd: 1 }, xp_gain: 20 },
    { id: "cul_refeicao_boa", profissao_id: "culinaria", nome: "Refeição Boa", nivel_profissao_min: 1, tempo_dias: 1, reagentes: [{ id: "carne_selvagem", qtd: 1 }, { id: "grao_fino", qtd: 1 }], output: { type: "item", item_id: "refeicao_boa", qtd: 1 }, xp_gain: 25 },
    { id: "cul_banquete", profissao_id: "culinaria", nome: "Banquete", nivel_profissao_min: 2, tempo_dias: 1, reagentes: [{ id: "carne_selvagem", qtd: 2 }, { id: "grao_fino", qtd: 2 }], output: { type: "item", item_id: "banquete", qtd: 1 }, xp_gain: 40 },
    { id: "alq_balsamo", profissao_id: "alquimia", nome: "Bálsamo Restaurador", nivel_profissao_min: 1, tempo_dias: 1, reagentes: [{ id: "erva_comum", qtd: 2 }], output: { type: "item", item_id: "balsamo_restaurador", qtd: 1 }, xp_gain: 25 },
    { id: "alq_vinho_elfico", profissao_id: "alquimia", nome: "Elixir Élfico", nivel_profissao_min: 2, tempo_dias: 1, reagentes: [{ id: "erva_comum", qtd: 1 }, { id: "erva_rara", qtd: 1 }], output: { type: "item", item_id: "vinho_elfico", qtd: 1 }, xp_gain: 35 },
    { id: "fer_punhal", profissao_id: "ferraria", nome: "Punhal de Combate", nivel_profissao_min: 1, tempo_dias: 1, reagentes: [{ id: "minerio_ferro", qtd: 2 }], output: { type: "item", item_id: "punhal_de_combate", qtd: 1 }, xp_gain: 25 },
    { id: "fer_espada_longa", profissao_id: "ferraria", nome: "Espada Longa", nivel_profissao_min: 2, tempo_dias: 1, reagentes: [{ id: "minerio_ferro", qtd: 2 }, { id: "minerio_aco", qtd: 1 }], output: { type: "item", item_id: "espada_longa", qtd: 1 }, xp_gain: 40 },
    { id: "fer_cota", profissao_id: "ferraria", nome: "Cota Metálica", nivel_profissao_min: 2, tempo_dias: 1, reagentes: [{ id: "minerio_ferro", qtd: 2 }, { id: "minerio_aco", qtd: 1 }], output: { type: "item", item_id: "cota_metalica", qtd: 1 }, xp_gain: 45 },
  ],
};
const REAGENT_BY_ID = Object.fromEntries(PROFESSIONS_DB.reagents.map((r) => [r.id, r]));
const PROFESSION_BY_ID = Object.fromEntries(PROFESSIONS_DB.professions.map((r) => [r.id, r]));
let selectedProfessionId = "culinaria";
let professionTargetName = null;
let selectedShopId = "taberna";
let selectedArsenalType = "weapon";
let pendingUpgradeId = null;


const SPELL_EFFECTS_CATALOG = [
  {
    id: "direct_damage",
    name: "Dano direto",
    type: "dano",
    baseCost: 3,
    unitCost: 2,
    minUnits: 1,
    maxUnits: 6,
    unitLabel: "+1d6",
    defaultDamageType: "arcano",
  },
  {
    id: "area_control",
    name: "Controle de área",
    type: "controle",
    baseCost: 5,
    unitCost: 2,
    minUnits: 1,
    maxUnits: 3,
    unitLabel: "+1 intensidade",
    status: "movimento reduzido",
  },
  {
    id: "temp_buff",
    name: "Bônus temporário",
    type: "buff",
    baseCost: 3,
    unitCost: 2,
    minUnits: 1,
    maxUnits: 3,
    unitLabel: "+1 bônus",
    stat: "defesa",
  },
  {
    id: "healing",
    name: "Cura",
    type: "cura",
    baseCost: 4,
    unitCost: 2,
    minUnits: 1,
    maxUnits: 4,
    unitLabel: "+1d8",
  },
  {
    id: "debuff",
    name: "Debuff",
    type: "debuff",
    baseCost: 4,
    unitCost: 2,
    minUnits: 1,
    maxUnits: 3,
    unitLabel: "+1 intensidade",
    stat: "ataque",
  },
  {
    id: "summon",
    name: "Invocação",
    type: "invocacao",
    baseCost: 8,
    unitCost: 3,
    minUnits: 1,
    maxUnits: 2,
    unitLabel: "+1 duração",
  },
];

const SPELL_CREATION_LEVEL_LIMITS = [
  { minLevel: 1, maxLevel: 1, points: 10 },
  { minLevel: 2, maxLevel: 2, points: 15 },
  { minLevel: 3, maxLevel: 4, points: 20 },
  { minLevel: 5, maxLevel: 20, points: 30 },
];

const SPELL_ICON_LIBRARY = [
  "🔥", "❄️", "⚡", "🌪️", "🌑", "☀️", "🧿", "✨", "💥", "🛡️", "❤️", "☠️",
  "🌿", "🪄", "🕸️", "🦴", "🌀", "💫", "🐉", "🔮",
];


const SPELL_PM_COST_BY_CIRCLE = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 7,
  7: 8,
  8: 10,
  9: 12,
};

function getSpellCirclePmCost(circle) {
  const safeCircle = Math.max(0, Math.min(9, parseInt(circle, 10) || 0));
  return SPELL_PM_COST_BY_CIRCLE[safeCircle] ?? safeCircle;
}

let grimoireTargetName = null;
let activeGrimoireTab = "spells";
let selectedSpellIcon = SPELL_ICON_LIBRARY[0];
let sheetTargetName = null;
let invTargetName = null;

/* ================= STORAGE ================= */
function load() {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  if (!raw.rooms || typeof raw.rooms !== "object") raw.rooms = {};
  if (!raw.chat || typeof raw.chat !== "object") raw.chat = {};
  if (!raw.scenes || typeof raw.scenes !== "object") raw.scenes = {};
  return raw;
}
function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function loadShopCatalogs() {
  const files = {
    taberna: "data/shops/shop_taberna.json",
    arsenal: "data/shops/shop_arsenal.json",
    ferreiro: "data/shops/shop_ferreiro.json",
  };

  await Promise.all(
    Object.entries(files).map(async ([shopId, file]) => {
      try {
        const resp = await fetch(file, { cache: "no-store" });
        if (!resp.ok) return;
        const json = await resp.json();
        if (json && Array.isArray(json.items)) SHOP_DB[shopId] = json;
      } catch (_) {
        // fallback silencioso
      }
    })
  );
}

function normalizeChatMessage(message) {
  if (typeof message === "string") {
    return {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user: "Sistema",
      text: message,
      senderType: "system",
      senderProfile: null,
      replyTo: null,
      reactions: {},
      createdAt: Date.now(),
    };
  }
  if (!message || typeof message !== "object") return null;

  const user = String(message.user || message.name || "Sistema").trim();
  const text = String(message.text || message.message || "").trim();
  if (!text) return null;

  return {
    id:
      String(message.id || "").trim() ||
      `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    user,
    text,
    senderType: String(message.senderType || "player"),
    senderProfile: message.senderProfile ? String(message.senderProfile) : null,
    replyTo: message.replyTo ? String(message.replyTo) : null,
    reactions:
      message.reactions && typeof message.reactions === "object"
        ? Object.fromEntries(
            Object.entries(message.reactions).map(([emoji, users]) => [
              emoji,
              Array.isArray(users)
                ? users.map((u) => String(u)).filter(Boolean)
                : [],
            ])
          )
        : {},
    createdAt: Number(message.createdAt) || Date.now(),
    spellCast: normalizeSpellCastMeta(message.spellCast),
  };
}

function normalizeSpellCastMeta(raw) {
  if (!raw || typeof raw !== "object") return null;
  const spell = raw.spell && typeof raw.spell === "object" ? raw.spell : null;
  if (!spell) return null;

  const spellName = String(spell.name || "").trim();
  if (!spellName) return null;

  return {
    spell: {
      id: String(spell.id || "").trim() || `spell_${Date.now()}`,
      name: spellName,
      level: Math.max(0, parseInt(spell.level || 0, 10) || 0),
      icon: String(spell.icon || "✨").trim() || "✨",
      pointCost: Math.max(0, parseInt(spell.pointCost || 0, 10) || 0),
      description: String(spell.description || "").trim(),
      components: Array.isArray(spell.components)
        ? spell.components.map((c) => String(c || "").trim()).filter(Boolean)
        : [],
      effects: Array.isArray(spell.effects)
        ? spell.effects.filter((fx) => fx && typeof fx === "object")
        : [],
    },
    slotLevel: Math.max(1, parseInt(raw.slotLevel || spell.level || 1, 10) || 1),
    rollText: String(raw.rollText || "").trim(),
    detailsText: String(raw.detailsText || "").trim(),
  };
}

function getRoomChat(data, roomName) {
  if (!Array.isArray(data.chat[roomName])) {
    const legacy = data.rooms?.[roomName]?.chat;
    data.chat[roomName] = Array.isArray(legacy) ? legacy : [];
  }

  data.chat[roomName] = data.chat[roomName]
    .map(normalizeChatMessage)
    .filter(Boolean);

  return data.chat[roomName];
}

function getRoomChatProfiles(data, roomName) {
  if (!data.chatProfiles || typeof data.chatProfiles !== "object") data.chatProfiles = {};
  if (!Array.isArray(data.chatProfiles[roomName])) data.chatProfiles[roomName] = [];
  data.chatProfiles[roomName] = data.chatProfiles[roomName]
    .map((n) => String(n || "").trim())
    .filter(Boolean)
    .filter((n, idx, arr) => arr.indexOf(n) === idx);
  return data.chatProfiles[roomName];
}

let data = load();
if (!data.rooms[room]) data.rooms[room] = {};
getRoomChat(data, room);
if (!data.scenes[room]) data.scenes[room] = structuredClone(DEFAULT_SCENE);
save(data);

/* ================= SCENE HELPERS ================= */
const SCENE_LAYER_KIND_LABELS = {
  map: "Mapa",
  objects: "Objetos",
  foreground: "Superior",
};

function normalizeSceneLayer(rawLayer, idx = 0) {
  const id = String(rawLayer?.id || `layer_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`);
  const kind = ["map", "objects", "foreground"].includes(rawLayer?.kind) ? rawLayer.kind : "objects";
  const z = Number.isFinite(rawLayer?.z) ? rawLayer.z : idx;
  return {
    id,
    name: String(rawLayer?.name || `Camada ${idx + 1}`),
    kind,
    src: String(rawLayer?.src || "").trim(),
    x: Number.isFinite(rawLayer?.x) ? rawLayer.x : 0,
    y: Number.isFinite(rawLayer?.y) ? rawLayer.y : 0,
    width: Number.isFinite(rawLayer?.width) ? rawLayer.width : 8,
    height: Number.isFinite(rawLayer?.height) ? rawLayer.height : 8,
    opacity: Number.isFinite(rawLayer?.opacity) ? Math.max(0, Math.min(100, rawLayer.opacity)) : 100,
    visible: rawLayer?.visible !== false,
    lockToGrid: rawLayer?.lockToGrid !== false,
    z,
  };
}

function getSceneLayerList(scene = null) {
  const s = scene || load().scenes[room];
  if (!Array.isArray(s.layers)) s.layers = [];
  return s.layers;
}

function sortSceneLayers(layers) {
  layers.sort((a, b) => (a.z || 0) - (b.z || 0));
  layers.forEach((layer, idx) => {
    layer.z = idx;
  });
}

function normalizeSceneLayers(scene) {
  const layers = getSceneLayerList(scene)
    .map((layer, idx) => normalizeSceneLayer(layer, idx))
    .filter((layer) => layer.src);
  sortSceneLayers(layers);
  scene.layers = layers;
}

function clampSceneLayerToGrid(layer, scene) {
  const s = scene || load().scenes[room];
  if (!layer.lockToGrid) return;
  layer.x = Math.max(0, Math.min(s.cols - 1, Math.round(layer.x)));
  layer.y = Math.max(0, Math.min(s.rows - 1, Math.round(layer.y)));
  layer.width = Math.max(1, Math.min(s.cols, Math.round(layer.width)));
  layer.height = Math.max(1, Math.min(s.rows, Math.round(layer.height)));
}


function extractArtboardFromScene(s, fallbackName = "Artboard") {
  return {
    id: `board_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: fallbackName,
    cols: s.cols,
    rows: s.rows,
    bgUrl: s.bgUrl || "",
    bgX: Number(s.bgX) || 0,
    bgY: Number(s.bgY) || 0,
    bgScale: Number(s.bgScale) || 120,
    bgOpacity: Number(s.bgOpacity) || 65,
    mapZoom: Number(s.mapZoom) || 1,
    gridStyle: s.gridStyle || "square",
    gridOpacity: Number(s.gridOpacity) || 55,
    gridLine: Number(s.gridLine) || 1,
    layers: structuredClone(Array.isArray(s.layers) ? s.layers : []),
    tiles: structuredClone(Array.isArray(s.tiles) ? s.tiles : []),
  };
}

function applyArtboardToScene(s, board) {
  if (!board) return;
  s.cols = board.cols;
  s.rows = board.rows;
  s.bgUrl = board.bgUrl || "";
  s.bgX = board.bgX || 0;
  s.bgY = board.bgY || 0;
  s.bgScale = board.bgScale || 120;
  s.bgOpacity = board.bgOpacity || 65;
  s.mapZoom = board.mapZoom || 1;
  s.gridStyle = board.gridStyle || "square";
  s.gridOpacity = board.gridOpacity || 55;
  s.gridLine = board.gridLine || 1;
  s.layers = structuredClone(Array.isArray(board.layers) ? board.layers : []);
  s.tiles = structuredClone(Array.isArray(board.tiles) ? board.tiles : []);
}

function ensureSceneArtboards(s) {
  if (!Array.isArray(s.artboards) || s.artboards.length === 0) {
    const first = extractArtboardFromScene(s, "Artboard 1");
    s.artboards = [first];
    s.activeArtboardId = first.id;
    return;
  }
  s.artboards = s.artboards.map((board, idx) => {
    const base = extractArtboardFromScene({ ...DEFAULT_SCENE, ...board }, board?.name || `Cenário ${idx + 1}`);
    base.id = board?.id || `board_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    base.name = board?.name || `Cenário ${idx + 1}`;
    return base;
  });
  if (!s.activeArtboardId || !s.artboards.some((b) => b.id === s.activeArtboardId)) {
    s.activeArtboardId = s.artboards[0].id;
  }
}

function syncSceneToActiveArtboard(s) {
  ensureSceneArtboards(s);
  const idx = s.artboards.findIndex((b) => b.id === s.activeArtboardId);
  if (idx < 0) return;
  const next = extractArtboardFromScene(s, s.artboards[idx].name || `Cenário ${idx + 1}`);
  next.id = s.artboards[idx].id;
  next.name = s.artboards[idx].name || next.name;
  s.artboards[idx] = next;
}

function ensureScene() {
  let data = load();
  if (!data.scenes) data.scenes = {};
  if (!data.scenes[room]) data.scenes[room] = structuredClone(DEFAULT_SCENE);

  const s = data.scenes[room];

  // cols/rows
  s.cols = Math.max(6, Math.min(80, s.cols || DEFAULT_COLS));
  s.rows = Math.max(6, Math.min(80, s.rows || DEFAULT_ROWS));

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
  s.mapZoom = Number.isFinite(s.mapZoom) ? Math.max(0.5, Math.min(1.6, s.mapZoom)) : 1;
  s.gridStyle = ["square", "dots"].includes(s.gridStyle) ? s.gridStyle : "square";
  s.gridOpacity = Number.isFinite(s.gridOpacity) ? Math.max(0, Math.min(100, s.gridOpacity)) : 55;
  s.gridLine = Number.isFinite(s.gridLine) ? Math.max(1, Math.min(4, s.gridLine)) : 1;
  normalizeSceneLayers(s);
  ensureSceneArtboards(s);
  syncSceneToActiveArtboard(s);
  const activeBoard = s.artboards.find((b) => b.id === s.activeArtboardId) || s.artboards[0];
  applyArtboardToScene(s, activeBoard);
  normalizeSceneLayers(s);

  data.scenes[room] = s;
  save(data);
}
ensureScene();

function applySceneCSS() {
  const s = load().scenes[room];
  arena.style.setProperty("--cols", s.cols);
  arena.style.setProperty("--rows", s.rows);

  const bg = s.bgUrl ? `url("${s.bgUrl}")` : "none";
  arena.style.setProperty("--scene-bg", bg);
  arena.style.setProperty("--scene-scale", `${s.bgScale}%`);
  arena.style.setProperty("--scene-x", `${s.bgX}px`);
  arena.style.setProperty("--scene-y", `${s.bgY}px`);
  arena.style.setProperty("--scene-opacity", (s.bgOpacity / 100).toString());
  arena.style.setProperty("--map-zoom", (s.mapZoom || 1).toString());
  arena.dataset.gridStyle = s.gridStyle || "square";
  arena.style.setProperty("--grid-opacity", ((s.gridOpacity ?? 55) / 100).toString());
  arena.style.setProperty("--grid-line", `${s.gridLine || 1}px`);
}

function tileIndex(x, y) {
  const s = load().scenes[room];
  return y * s.cols + x;
}
function getTile(x, y) {
  const s = load().scenes[room];
  const idx = y * s.cols + x;
  return TILE_TYPES.includes(s.tiles[idx]) ? s.tiles[idx] : "floor";
}
function setTile(x, y, type) {
  let data = load();
  const s = data.scenes[room];
  const idx = y * s.cols + x;
  s.tiles[idx] = TILE_TYPES.includes(type) ? type : "floor";
  save(data);
}

function clearTileClasses(cell) {
  TILE_TYPES.forEach((type) => cell.classList.remove(`tile-${type}`));
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

function defaultAttributeScores() {
  return { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
}

function defaultAttributeMods() {
  return { str: -1, dex: -1, con: -1, int: -1, wis: -1, cha: -1 };
}

function getPointBuyRow(score) {
  return ATTRIBUTE_POINT_BUY.find((r) => r.score === score);
}

function pointBuyCost(score) {
  const row = getPointBuyRow(score);
  return row ? row.cost : 0;
}

function scoreToMod(score) {
  const row = getPointBuyRow(score);
  return row ? row.mod : -1;
}

function normalizeScore(score) {
  const n = parseInt(score, 10);
  if (Number.isNaN(n)) return 8;
  return Math.max(8, Math.min(15, n));
}

function normalizeAttributeScores(scores) {
  const next = defaultAttributeScores();
  ATTRIBUTES.forEach((a) => {
    next[a.id] = normalizeScore(scores?.[a.id]);
  });
  return next;
}

function totalPointBuyCost(scores) {
  return ATTRIBUTES.reduce((acc, a) => acc + pointBuyCost(scores[a.id]), 0);
}

function computeProficiencyBonus(level) {
  const lv = Math.max(1, parseInt(level || 1, 10) || 1);
  return 2 + Math.floor((lv - 1) / 4);
}

function abilityShort(abilityId) {
  const found = ATTRIBUTES.find((a) => a.id === abilityId);
  return found ? found.short : abilityId.toUpperCase();
}

function fmtMod(value) {
  return value >= 0 ? `+${value}` : `${value}`;
}

function getClassSuggestedSkills(className) {
  const cls = CLASSES[className] || null;
  if (!cls || !cls.skillChoices || !Array.isArray(cls.skillChoices.from)) return [];
  const amount = Math.max(0, parseInt(cls.skillChoices.choose || 0, 10) || 0);
  return cls.skillChoices.from.slice(0, amount);
}

function autoApplyClassSkillProficiencies(p) {
  if (!p) return;
  if (p.classAutoFilledFor === p.class) return;
  const suggested = getClassSuggestedSkills(p.class);
  const current = new Set(p.skillProficiencies || []);
  suggested.forEach((skillId) => current.add(skillId));
  p.skillProficiencies = Array.from(current);
  p.classAutoFilledFor = p.class;
}

function computeSheetBonusBreakdown(p) {
  const race = RACES[p.race] || null;
  const bg = BACKGROUNDS[p.background] || null;
  const itemMods = computeItemMods(p);
  const byAttr = { str: [], dex: [], con: [], int: [], wis: [], cha: [] };

  (race?.abilityBonuses || []).forEach((entry) => {
    if (byAttr[entry.ability]) byAttr[entry.ability].push(`Raça: +${entry.modDelta}`);
  });
  (bg?.abilityBonuses || []).forEach((entry) => {
    if (byAttr[entry.ability]) byAttr[entry.ability].push(`Background: +${entry.modDelta}`);
  });
  if (itemMods.str) byAttr.str.push(`Itens: ${fmtMod(itemMods.str)}`);
  if (itemMods.dex) byAttr.dex.push(`Itens: ${fmtMod(itemMods.dex)}`);
  if (itemMods.spr) byAttr.wis.push(`Itens: ${fmtMod(itemMods.spr)}`);

  return {
    byAttr,
    hpBonus: itemMods.hpMax || 0,
    manaBonus: itemMods.manaMax || 0,
    defenseBonus: itemMods.defense || 0,
  };
}

function ensurePlayerSchema(p) {
  if (p.hp === undefined) p.hp = 100;
  if (p.hpMax === undefined) p.hpMax = 100;
  if (p.mana === undefined) p.mana = 50;
  if (p.manaMax === undefined) p.manaMax = 50;

  if (p.race === undefined) p.race = Object.keys(RACES)[0] || "Humano";
  if (p.class === undefined) p.class = Object.keys(CLASSES)[0] || "Guerreiro";
  if (p.background === undefined) p.background = "Nenhum";
  if (p.level === undefined) p.level = 1;
  p.classes = normalizeMulticlassEntries(p);
  p.class = p.classes[0].classId;
  p.level = getTotalClassLevel(p.classes);
  if (p.owner === undefined) p.owner = "";
  if (p.onTable === undefined) p.onTable = true;

  if (p.gold === undefined) p.gold = 60;
  if (p.downtime_days === undefined) p.downtime_days = 0;
  if (!p.professions_progress || typeof p.professions_progress !== "object") p.professions_progress = {};
  for (const prof of PROFESSIONS_DB.professions) {
    if (!p.professions_progress[prof.id]) p.professions_progress[prof.id] = { xp: 0, level: 1 };
  }
  if (!p.reagents_inventory || typeof p.reagents_inventory !== "object") p.reagents_inventory = {};
  if (!Array.isArray(p.production_professions)) p.production_professions = ["culinaria", "alquimia"];
  p.production_professions = p.production_professions.filter((id) => ["culinaria", "alquimia", "ferraria"].includes(id)).slice(0, MAX_PRODUCTION_PROFESSIONS);
  if (!p.player_shop || typeof p.player_shop !== "object") p.player_shop = {};
  p.player_shop.enabled = !!p.player_shop.enabled;
  if (typeof p.player_shop.name !== "string") p.player_shop.name = `${p.name || "Loja"} & Cia`;
  if (typeof p.player_shop.icon !== "string") p.player_shop.icon = "🏪";
  if (!Array.isArray(p.player_shop.inventory)) p.player_shop.inventory = [];
  if (!p.player_shop.rules || typeof p.player_shop.rules !== "object") p.player_shop.rules = {};
  if (p.player_shop.rules.allow_haggle === undefined) p.player_shop.rules.allow_haggle = false;
  if (p.player_shop.rules.sell_to_npcs === undefined) p.player_shop.rules.sell_to_npcs = true;

  p.attributeScores = normalizeAttributeScores(p.attributeScores);
  p.attributeMods = { ...defaultAttributeMods(), ...(p.attributeMods || {}) };
  if (!Array.isArray(p.skillProficiencies)) p.skillProficiencies = [];
  if (!Array.isArray(p.expertiseSkills)) p.expertiseSkills = [];

  if (!Array.isArray(p.skills)) p.skills = [];
  if (!Array.isArray(p.customSpells)) p.customSpells = [];
  if (!Array.isArray(p.spellSlots)) p.spellSlots = Array(8).fill(null);
  p.spellSlots = normalizeQuickSlots(p.spellSlots);

  if (!p.spellcasting || typeof p.spellcasting !== "object") p.spellcasting = {};
  if (!Array.isArray(p.spellcasting.slotsMax)) p.spellcasting.slotsMax = [];
  if (!Array.isArray(p.spellcasting.slotsCurrent)) p.spellcasting.slotsCurrent = [];

  if (!Array.isArray(p.inventory)) {
    if (typeof p.inventory === "string" && p.inventory.trim()) {
      p.inventory = [p.inventory.trim()];
    } else if (
      p.inventory &&
      typeof p.inventory === "object" &&
      Array.isArray(p.inventory.items)
    ) {
      p.inventory = p.inventory.items.filter(Boolean);
    } else {
      p.inventory = [];
    }
  }

  if (!p.equipped || typeof p.equipped !== "object" || Array.isArray(p.equipped)) {
    p.equipped = createEmptyEquipped();
  } else {
    p.equipped = { ...createEmptyEquipped(), ...p.equipped };
  }

  if (p.color === undefined) p.color = randomColor();
  if (p.avatar === undefined) p.avatar = "🧙";
  p.avatar = normalizeAvatar(p.avatar);

  const s = load().scenes[room];
  if (p.x === undefined) p.x = Math.floor(Math.random() * s.cols);
  if (p.y === undefined) p.y = Math.floor(Math.random() * s.rows);
}

function normalizeQuickSlotEntry(entry) {
  if (!entry) return null;
  if (typeof entry === "string") {
    return { type: "spell", id: entry };
  }
  if (typeof entry !== "object") return null;

  const type = entry.type === "ability" ? "ability" : "spell";
  const id = String(entry.id || "").trim();
  if (!id) return null;
  return { type, id };
}

function normalizeQuickSlots(rawSlots, size = 8) {
  const base = Array.from({ length: size }, (_, idx) => normalizeQuickSlotEntry(rawSlots?.[idx] || null));
  return base;
}

function hpColorFromPercent(pct) {
  if (pct <= 30) return "#ff4d4d";
  if (pct <= 65) return "#ffa726";
  return "#4cff6a";
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
function createChatMessage({ user, text, senderType = "player", senderProfile = null, spellCast = null }) {
  return {
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    user,
    text,
    senderType,
    senderProfile,
    replyTo: pendingReplyId,
    reactions: {},
    createdAt: Date.now(),
    spellCast: normalizeSpellCastMeta(spellCast),
  };
}

function resolveSenderIdentity() {
  if (chatSenderKey === "character") {
    return { label: "Personagem", senderType: "character", senderProfile: null };
  }
  if (chatSenderKey.startsWith("profile:")) {
    const profileName = chatSenderKey.replace("profile:", "").trim();
    return {
      label: profileName || currentUser,
      senderType: "profile",
      senderProfile: profileName || null,
    };
  }
  return { label: currentUser, senderType: "player", senderProfile: null };
}

function clearReplyState() {
  pendingReplyId = null;
  renderReplyPreview();
}

function pushChat(user, text, meta = {}) {
  let data = load();
  const roomChat = getRoomChat(data, room);
  roomChat.push(createChatMessage({ user, text, ...meta }));
  save(data);
  updateChat();
}
function pushAction(user, text) {
  pushChat(user, "* " + text);
}

function pushSpellCastMessage(user, playerName, spell, slotLevel, rollText, detailsText) {
  const castText = `${playerName} conjurou ${spell.icon || "✨"} ${spell.name} usando 1 slot de nível ${slotLevel}.`;
  pushChat(user, `* ${castText}`, {
    spellCast: {
      spell,
      slotLevel,
      rollText,
      detailsText,
    },
  });
}


function spellToCardHtml(spell) {
  if (!spell) return "";
  const effects = (spell.effects || []).map((fx) => {
    if (fx.type === "dano") return `• Dano ${fx.damageDice} (${fx.damageType})`;
    if (fx.type === "cura") return `• Cura ${fx.healDice}`;
    if (fx.type === "status") return `• Controle: ${fx.effect} (${fx.duration})`;
    if (fx.type === "buff") return `• Bônus: +${fx.bonus} ${fx.stat}`;
    if (fx.type === "debuff") return `• Debuff: -${fx.penalty} ${fx.stat}`;
    return `• Invocação (${fx.duration})`;
  }).join("<br>");

  return `
    <div class="spellCard">
      <div class="spellHead">
        <strong>${spell.icon || "✨"} ${spell.name}</strong>
        <span>Nv ${spell.level} • ${spell.pointCost} pts</span>
      </div>
      <div style="opacity:.8; font-size:12px;">${spell.description || "Sem descrição."}</div>
      <div style="margin:6px 0; font-size:12px;">${effects}</div>
      <div class="spellFooter">
        <span>Componentes: ${(spell.components || []).join(", ") || "—"}</span>
      </div>
    </div>
  `;
}

function resolveSpellAutoRoll(spell) {
  const pools = [];
  const notes = [];
  (spell.effects || []).forEach((fx) => {
    if (fx.type === "dano" && fx.damageDice) {
      const parsed = parseDiceExpression(fx.damageDice);
      if (parsed?.length) pools.push(...parsed);
      notes.push(`Dano ${fx.damageDice} (${fx.damageType || "arcano"})`);
    } else if (fx.type === "cura" && fx.healDice) {
      const parsed = parseDiceExpression(fx.healDice);
      if (parsed?.length) pools.push(...parsed);
      notes.push(`Cura ${fx.healDice}`);
    } else if (fx.type === "buff") {
      notes.push(`Bônus: +${fx.bonus} ${fx.stat} (${fx.duration || "1 turno"})`);
    } else if (fx.type === "debuff") {
      notes.push(`Debuff: -${fx.penalty} ${fx.stat} (${fx.duration || "1 turno"})`);
    } else if (fx.type === "status") {
      notes.push(`Controle: ${fx.effect} (${fx.duration || "1 turno"})`);
    }
  });

  if (!pools.length) return { rollText: "", detailsText: notes.join(" • ") };

  const expr = pools.map((p) => `${p.count}d${p.sides}`).join(" + ");
  const rollText = formatRollAction(pools, expr);
  return { rollText, detailsText: notes.join(" • ") };
}

function castSpellForPlayer(playerName, spellId) {
  const data = load();
  const p = data.rooms[room][playerName];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);

  const spell = (p.customSpells || []).find((s) => s.id === spellId);
  if (!spell) return;

  const pmCost = getSpellCirclePmCost(spell.level || 0);
  const currentMana = parseInt(p.mana, 10) || 0;
  if (currentMana - pmCost < 0) {
    alert(`PM insuficiente para conjurar ${spell.name}. Custo: ${pmCost} PM.`);
    return;
  }

  p.mana = Math.max(0, currentMana - pmCost);
  save(data);

  const { rollText, detailsText } = resolveSpellAutoRoll(spell);
  pushSpellCastMessage(currentUser, playerName, spell, spell.level, rollText, detailsText);

  if (grimoireTargetName === playerName) renderGrimoire(p);
  updateArena();
}

function sendMessage() {
  let input = document.getElementById("messageInput");
  let text = input.value.trim();
  if (!text) return;

  if (handleRollCommand(text)) {
    input.value = "";
    return;
  }

  const sender = resolveSenderIdentity();
  pushChat(sender.label, text, {
    senderType: sender.senderType,
    senderProfile: sender.senderProfile,
  });
  input.value = "";
  clearReplyState();
  updateChat();
}


function formatTimestampBR(value) {
  const d = new Date(Number(value) || Date.now());
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildSessionReportText(roomChat) {
  const lines = [];
  const generatedAt = formatTimestampBR(Date.now());
  lines.push(`Relatório da Sessão - Sala: ${room}`);
  lines.push(`Gerado em: ${generatedAt}`);
  lines.push("");

  roomChat.forEach((msg, index) => {
    const stamp = formatTimestampBR(msg.createdAt);
    const replyPrefix = msg.replyTo ? "↳ resposta | " : "";
    const kind = msg.senderType === "character"
      ? "Fala"
      : msg.senderType === "profile"
        ? "Intenção"
        : msg.senderType === "system"
          ? "Sistema"
          : "Conversa";

    lines.push(`${index + 1}. [${stamp}] ${replyPrefix}${kind} - ${msg.user}`);
    lines.push(msg.text);

    const reactions = Object.entries(msg.reactions || {})
      .map(([emoji, users]) => `${emoji} x${Array.isArray(users) ? users.length : 0}`)
      .filter((part) => !part.endsWith("x0"));
    if (reactions.length) {
      lines.push(`Reações: ${reactions.join(" | ")}`);
    }

    lines.push("");
  });

  if (roomChat.length === 0) {
    lines.push("Nenhuma mensagem registrada nesta sessão.");
  }

  return lines.join("\n");
}

function buildSessionReportHtml(reportText) {
  const safeText = escapeHtml(reportText).replaceAll("\n", "<br>");
  return `
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatório da Sessão</title>
        <style>
          @page { size: A4; margin: 16mm; }
          body {
            font-family: "Segoe UI", Arial, sans-serif;
            color: #111;
            line-height: 1.5;
            font-size: 12px;
            white-space: normal;
          }
          h1 {
            margin: 0 0 10px;
            font-size: 18px;
          }
          .content {
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <h1>Relatório da Sessão</h1>
        <div class="content">${safeText}</div>
      </body>
    </html>
  `;
}

function exportChatReportPDF() {
  const data = load();
  const roomChat = getRoomChat(data, room);
  const reportText = buildSessionReportText(roomChat);
  const reportHtml = buildSessionReportHtml(reportText);

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    alert("Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-up está ativo.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(reportHtml);
  printWindow.document.close();

  const runPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  if (printWindow.document.readyState === "complete") {
    runPrint();
  } else {
    printWindow.onload = runPrint;
  }
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

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderRollDetails(actionText) {
  const m = actionText.match(/^rolou\s+(.+?)\s+→\s+(.+?)\s+=\s+(-?\d+)$/i);
  if (!m) return null;

  const expression = m[1];
  const detailsRaw = m[2];
  const total = m[3];

  const pools = detailsRaw
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const poolMatch = part.match(/^(\d+d\d+)=\[([^\]]*)\]$/i);
      if (!poolMatch) return null;
      return {
        dice: poolMatch[1],
        rolls: poolMatch[2],
      };
    })
    .filter(Boolean);

  if (!pools.length) return null;

  const chips = pools
    .map(
      (pool) =>
        `<span class="rollPool"><span class="rollDice">${escapeHtml(pool.dice)}</span> <span class="rollValues">[${escapeHtml(pool.rolls)}]</span></span>`
    )
    .join("");

  return `
    <div class="rollSummary">
      <span class="rollExpr">${escapeHtml(expression)}</span>
      <span class="rollTotalLabel">Total</span>
      <span class="rollTotal">${escapeHtml(total)}</span>
    </div>
    <div class="rollPools">${chips}</div>
  `;
}

function handleRollCommand(text) {
  const cmd = text.match(/^\/(r|roll)\s*(.*)$/i);
  if (!cmd) return false;

  const expression = (cmd[2] || "").trim();
  const pools = parseDiceExpression(expression);
  if (!pools) {
    pushChat("Sistema", "Uso: /roll 2d6 + 1d4 (dados: d4,d6,d8,d10,d12,d20,d100)");
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

function setDiceTrayOpen(open) {
  const tray = document.getElementById("diceTray");
  const toggle = document.getElementById("diceTrayToggle");
  if (!tray || !toggle) return;

  tray.classList.toggle("collapsed", !open);
  tray.setAttribute("aria-hidden", String(!open));
  toggle.setAttribute("aria-expanded", String(open));
}

function toggleDiceTray() {
  const tray = document.getElementById("diceTray");
  if (!tray) return;
  setDiceTrayOpen(tray.classList.contains("collapsed"));
}

function closeDiceTray() {
  setDiceTrayOpen(false);
}

document.getElementById("messageInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function setReplyTarget(messageId) {
  pendingReplyId = messageId;
  renderReplyPreview();
  document.getElementById("messageInput")?.focus();
}

function renderReplyPreview() {
  const box = document.getElementById("replyPreview");
  if (!box) return;

  if (!pendingReplyId) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }

  const data = load();
  const roomChat = getRoomChat(data, room);
  const original = roomChat.find((m) => m.id === pendingReplyId);
  if (!original) {
    pendingReplyId = null;
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }

  box.classList.remove("hidden");
  box.innerHTML = `<div class="replyPreviewHeader">Respondendo <strong>${escapeHtml(original.user)}</strong></div><div class="replyPreviewText">${escapeHtml(original.text)}</div><button type="button" onclick="clearReplyState()">Cancelar</button>`;
}

function toggleReaction(messageId, emoji) {
  let data = load();
  const roomChat = getRoomChat(data, room);
  const msg = roomChat.find((m) => m.id === messageId);
  if (!msg) return;

  if (!msg.reactions || typeof msg.reactions !== "object") msg.reactions = {};
  if (!Array.isArray(msg.reactions[emoji])) msg.reactions[emoji] = [];

  const already = msg.reactions[emoji].includes(currentUser);
  if (already) {
    msg.reactions[emoji] = msg.reactions[emoji].filter((u) => u !== currentUser);
  } else {
    msg.reactions[emoji].push(currentUser);
  }

  if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];

  save(data);
  updateChat();
}

function closeChatContextMenu() {
  const existing = document.getElementById("chatContextMenu");
  if (existing) existing.remove();
  if (typeof chatContextCleanup === "function") {
    chatContextCleanup();
    chatContextCleanup = null;
  }
}

function openChatContextMenu(messageId, x, y) {
  closeChatContextMenu();

  const menu = document.createElement("div");
  menu.id = "chatContextMenu";
  menu.className = "chatContextMenu";
  menu.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  const replyBtn = document.createElement("button");
  replyBtn.type = "button";
  replyBtn.textContent = "Responder";
  replyBtn.onclick = () => {
    setReplyTarget(messageId);
    closeChatContextMenu();
  };
  menu.appendChild(replyBtn);

  const reactionWrap = document.createElement("div");
  reactionWrap.className = "chatContextReactions";
  QUICK_REACTIONS.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = emoji;
    btn.title = `Reagir com ${emoji}`;
    btn.onclick = () => {
      toggleReaction(messageId, emoji);
      closeChatContextMenu();
    };
    reactionWrap.appendChild(btn);
  });
  menu.appendChild(reactionWrap);

  document.body.appendChild(menu);

  const rect = menu.getBoundingClientRect();
  const margin = 10;
  const left = Math.min(x, window.innerWidth - rect.width - margin);
  const top = Math.min(y, window.innerHeight - rect.height - margin);
  menu.style.left = `${Math.max(margin, left)}px`;
  menu.style.top = `${Math.max(margin, top)}px`;

  const onWindowClick = (event) => {
    if (!menu.contains(event.target)) closeChatContextMenu();
  };
  const onEsc = (event) => {
    if (event.key === "Escape") closeChatContextMenu();
  };

  window.addEventListener("click", onWindowClick);
  window.addEventListener("pointerdown", onWindowClick);
  window.addEventListener("keydown", onEsc);

  chatContextCleanup = () => {
    window.removeEventListener("click", onWindowClick);
    window.removeEventListener("pointerdown", onWindowClick);
    window.removeEventListener("keydown", onEsc);
  };
}

function toggleEmojiPicker() {
  const picker = document.getElementById("emojiPicker");
  if (!picker) return;
  picker.classList.toggle("hidden");
}

function addEmojiToInput(emoji) {
  const input = document.getElementById("messageInput");
  if (!input) return;
  input.value = `${input.value}${emoji}`;
  input.focus();
}

function refreshSenderSelect() {
  const select = document.getElementById("chatSenderSelect");
  if (!select) return;

  const data = load();
  const profiles = getRoomChatProfiles(data, room);

  const options = [
    { value: "player", label: `👤 Jogador (${currentUser})` },
    { value: "character", label: "🎭 Personagem" },
    ...profiles.map((name) => ({ value: `profile:${name}`, label: `🧩 ${name}` })),
  ];

  select.innerHTML = options
    .map((opt) => `<option value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</option>`)
    .join("");

  if (!options.some((opt) => opt.value === chatSenderKey)) chatSenderKey = "player";
  select.value = chatSenderKey;
}

function addChatProfile() {
  const input = document.getElementById("chatProfileName");
  const name = String(input?.value || "").trim();
  if (!name) return;

  let data = load();
  const profiles = getRoomChatProfiles(data, room);
  if (!profiles.includes(name)) profiles.push(name);
  save(data);

  chatSenderKey = `profile:${name}`;
  input.value = "";
  refreshSenderSelect();
}

function updateChat() {
  let data = load();
  const roomChat = getRoomChat(data, room);
  let chatBox = document.getElementById("chat");
  chatBox.innerHTML = "";

  roomChat.forEach((msg) => {
    let div = document.createElement("div");
    div.className = "chatMessage";
    div.title = "Botão direito ou ⋯ para responder e reagir";
    div.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openChatContextMenu(msg.id, event.clientX, event.clientY);
    });

    const actionsBtn = document.createElement("button");
    actionsBtn.type = "button";
    actionsBtn.className = "chatMessageMenuBtn";
    actionsBtn.textContent = "⋯";
    actionsBtn.title = "Responder ou reagir";
    actionsBtn.onclick = (event) => {
      event.stopPropagation();
      const rect = actionsBtn.getBoundingClientRect();
      openChatContextMenu(msg.id, rect.left + rect.width / 2, rect.bottom + 6);
    };
    div.appendChild(actionsBtn);
    const safeUser = escapeHtml(msg.user);
    const safeText = escapeHtml(msg.text);

    if (msg.replyTo) {
      const original = roomChat.find((candidate) => candidate.id === msg.replyTo);
      if (original) {
        const replyDiv = document.createElement("div");
        replyDiv.className = "chatReplyRef";
        replyDiv.innerHTML = `<strong>${escapeHtml(original.user)}</strong>: ${escapeHtml(original.text)}`;
        div.appendChild(replyDiv);
      }
    }

    const content = document.createElement("div");

    if (msg.text.startsWith("*") && msg.spellCast?.spell) {
      div.classList.add("chatAction", "chatSpellCast");
      const actionText = msg.text.replace(/^\*\s*/, "");
      const spell = msg.spellCast.spell;
      const detailsLine = [spell.description || "", msg.spellCast.detailsText || ""]
        .filter(Boolean)
        .join(" • ");
      const rollHtml = msg.spellCast.rollText ? renderRollDetails(msg.spellCast.rollText) : null;
      content.innerHTML = `
        <div class="chatActionHead"><strong>${safeUser}</strong> <span>conjurou</span></div>
        <div class="chatSpellLead">${escapeHtml(actionText)}</div>
        <div class="chatSpellCardWrap">${spellToCardHtml(spell)}</div>
        ${detailsLine ? `<div class="chatSpellDetails">${escapeHtml(detailsLine)}</div>` : ""}
        ${rollHtml ? `<div class="chatSpellRoll">${rollHtml}</div>` : ""}
      `;
    } else if (msg.text.startsWith("*")) {
      div.classList.add("chatAction");
      const actionText = msg.text.replace(/^\*\s*/, "");
      const rollHtml = renderRollDetails(actionText);
      if (rollHtml) {
        div.classList.add("chatRoll");
        content.innerHTML = `<div class="chatActionHead"><strong>${safeUser}</strong> <span>rolou</span></div>${rollHtml}`;
      } else {
        content.innerHTML = `<strong>${safeUser}</strong> ${safeText}`;
      }
    } else if (msg.text.startsWith("(")) {
      div.classList.add("chatOOC");
      content.innerHTML = safeText;
    } else {
      div.classList.add("chatSpeak");
      content.innerHTML = `<strong>${safeUser}:</strong> ${safeText}`;
    }

    div.appendChild(content);

    const reactionSummary = document.createElement("div");
    reactionSummary.className = "chatReactionSummary";
    QUICK_REACTIONS.forEach((emoji) => {
      const users = Array.isArray(msg.reactions?.[emoji]) ? msg.reactions[emoji] : [];
      if (!users.length) return;
      const mine = users.includes(currentUser);
      const chip = document.createElement("span");
      chip.className = `chatReactionChip ${mine ? "mine" : ""}`;
      chip.textContent = `${emoji} ${users.length}`;
      reactionSummary.appendChild(chip);
    });
    if (reactionSummary.children.length > 0) div.appendChild(reactionSummary);

    chatBox.appendChild(div);
  });

  closeChatContextMenu();
  renderReplyPreview();
  chatBox.scrollTop = chatBox.scrollHeight;
  save(data);
}

function initChatComposer() {
  const picker = document.getElementById("emojiPicker");
  if (picker) {
    picker.innerHTML = PICKER_EMOJIS.map((emoji) => `<button type="button" onclick="addEmojiToInput('${emoji}')">${emoji}</button>`).join("");
  }

  const select = document.getElementById("chatSenderSelect");
  if (select) {
    select.onchange = () => {
      chatSenderKey = select.value;
    };
  }

  refreshSenderSelect();
  renderReplyPreview();
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

function normalizeClassId(className) {
  const raw = String(className || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return raw.trim();
}

function resolveArmorAcCandidate(armor, dexMod) {
  if (!armor) return null;
  const category = String(armor?.stats?.category || "").toLowerCase();
  const defenseBonus = armor?.stats?.defenseBonus ?? armor?.mods?.defense ?? 0;
  const baseArmor = armor?.stats?.baseArmor ?? (10 + defenseBonus);
  const dexCap = armor?.stats?.dexCap ?? armor?.stats?.dex_cap ?? 2;

  let ac = baseArmor;
  if (category === "light") ac += dexMod;
  if (category === "medium") ac += Math.min(dexMod, dexCap);
  return ac;
}

function computeDefenseFromRules(p, mods, itemMods) {
  const candidates = [10 + mods.dex];
  const equipped = p.equipped || {};
  const armor = equipped.armor ? ITEM_DB[equipped.armor] : null;
  const shield = equipped.shield ? ITEM_DB[equipped.shield] : null;
  const normalizedClass = normalizeClassId(getPrimaryClassEntry(p).classId);

  if (!armor) {
    if (normalizedClass === "barbaro") candidates.push(10 + mods.dex + mods.con);
    if (normalizedClass === "monge") candidates.push(10 + mods.dex + mods.wis);
  }

  const armorCandidate = resolveArmorAcCandidate(armor, mods.dex);
  if (armorCandidate !== null) candidates.push(armorCandidate);

  let defense = Math.max(...candidates);
  if (shield) {
    defense += shield?.stats?.defenseBonus ?? shield?.mods?.defense ?? 0;
  }

  const armorAndShieldBonus = (armor?.mods?.defense || 0) + (shield?.mods?.defense || 0);
  const extraDefense = (itemMods.defense || 0) - armorAndShieldBonus;
  if (extraDefense > 0) defense += extraDefense;

  return defense;
}
function invCount(p) {
  return (p.inventory || []).length;
}
function invMax(p) {
  return p.invMax || 12;
}

function addItemToPlayer(p, itemId) {
  if (!itemId) return { ok: false, msg: "Item não existe" };
  if (invCount(p) >= invMax(p)) return { ok: false, msg: "Inventário cheio" };
  p.inventory.push(itemId);
  return { ok: true };
}
function removeItemFromPlayer(p, itemId) {
  const idx = (p.inventory || []).findIndex((entry) => {
    const it = resolveInventoryItem(entry);
    return it && it.id === itemId;
  });
  if (idx >= 0) p.inventory.splice(idx, 1);
}
function equipItem(p, itemId) {
  const it = ITEM_DB[itemId];
  if (!it || !it.equipSlot) return;
  const hasItem = (p.inventory || []).some((entry) => {
    const invIt = resolveInventoryItem(entry);
    return invIt && invIt.id === itemId;
  });
  if (!hasItem) return;
  p.equipped[it.equipSlot] = itemId;
}
function unequipSlot(p, slot) {
  if (!p.equipped) return;
  p.equipped[slot] = null;
}
function useConsumable(p, itemId) {
  const it = ITEM_DB[itemId];
  if (!it || !it.consume) return { ok: false };
  const idx = (p.inventory || []).findIndex((entry) => {
    const invIt = resolveInventoryItem(entry);
    return invIt && invIt.id === itemId;
  });
  if (idx < 0) return { ok: false };

  if (it.consume.hp) {
    p.hp = Math.max(0, Math.min(p.hpMax, p.hp + it.consume.hp));
  }
  if (it.consume.mana) {
    p.mana = Math.max(0, Math.min(p.manaMax, p.mana + it.consume.mana));
  }
  p.inventory.splice(idx, 1);
  return { ok: true };
}

/* ================= REGRAS / RECALC ================= */
function getPrimaryClassEntry(p) {
  const classEntries = Array.isArray(p?.classes) ? p.classes : [];
  if (classEntries.length && classEntries[0]?.classId) return classEntries[0];
  const fallbackClass = String(p?.class || Object.keys(CLASSES)[0] || "Guerreiro");
  const fallbackLevel = Math.max(1, parseInt(p?.level, 10) || 1);
  return { classId: fallbackClass, level: fallbackLevel };
}


function recalcFromSheet(p) {
  const defaultRaceName = Object.keys(RACES)[0];
  const defaultClassName = Object.keys(CLASSES)[0];
  const race = RACES[p.race] || RACES[defaultRaceName] || LEGACY_RACES.Humano;
  const classEntries = normalizeMulticlassEntries(p);
  const primaryClassEntry = classEntries[0];
  const cls = CLASSES[primaryClassEntry.classId] || CLASSES[defaultClassName] || LEGACY_CLASSES.Guerreiro;
  const bg = BACKGROUNDS[p.background] || BACKGROUNDS.Nenhum;

  const level = getTotalClassLevel(classEntries);
  p.classes = classEntries;
  p.class = primaryClassEntry.classId;
  p.level = level;


  p.attributeScores = normalizeAttributeScores(p.attributeScores);
  const totalCost = totalPointBuyCost(p.attributeScores);
  if (totalCost > POINT_BUY_BUDGET) {
    p.attributeScores = defaultAttributeScores();
  }

  const mods = defaultAttributeMods();
  ATTRIBUTES.forEach((attr) => {
    mods[attr.id] = scoreToMod(p.attributeScores[attr.id]);
  });

  [...(race.abilityBonuses || []), ...(bg.abilityBonuses || [])].forEach((entry) => {
    if (!entry || !mods.hasOwnProperty(entry.ability)) return;
    mods[entry.ability] += parseInt(entry.modDelta || 0, 10) || 0;
  });

  const itemMods = computeItemMods(p);
  mods.str += itemMods.str;
  mods.dex += itemMods.dex;
  mods.wis += itemMods.spr;

  p.attributeMods = mods;

  let hpMax = computeMulticlassHpFromRules(p, classEntries, mods.con);
  let manaMax = computeMulticlassMagicPointsFromRules(classEntries);

  if (String(p.race || "").toLowerCase().includes("anão da colina") || p.race === "Anao") hpMax += level * 2;

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

  p.defense = computeDefenseFromRules(p, mods, itemMods);
  p.proficiencyBonus = computeProficiencyBonus(level);
  autoApplyClassSkillProficiencies(p);
  p.skillProficiencies = Array.from(new Set([...(p.skillProficiencies || []), ...(bg.skillProficiencies || [])]));
  const classSkills = classEntries.flatMap((entry) => (CLASSES[entry.classId]?.abilities || []));
  p.skills = [...(race.abilities || []), ...classSkills];
  p.invMax = 12 + (itemMods.invExtra || 0);
  syncSpellcasting(p);
}

/* ================= CREATE USER ================= */
function ensureCurrentUserRecord(setup = null) {
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
      race: setup?.race || pendingCharacterSetup?.race || Object.keys(RACES)[0] || "Humano",
      class: setup?.className || pendingCharacterSetup?.className || Object.keys(CLASSES)[0] || "Guerreiro",
      classes: [{ classId: setup?.className || pendingCharacterSetup?.className || Object.keys(CLASSES)[0] || "Guerreiro", level: 1 }],
      background: "Nenhum",
      level: 1,
      owner: setup?.owner || normalizeEmail(currentAccountEmail) || "",
      attributeScores: defaultAttributeScores(),
      attributeMods: defaultAttributeMods(),
      skillProficiencies: [],
      expertiseSkills: [],
      skills: [],
      gold: 60,
      downtime_days: 0,
      professions_progress: {},
      reagents_inventory: {},
      production_professions: ["culinaria", "alquimia"],
      player_shop: { enabled: false, name: "Loja do Herói", icon: "🏪", inventory: [], rules: { allow_haggle: false, sell_to_npcs: true } },
      inventory: [],
      equipped: createEmptyEquipped(),
      color: randomColor(),
      avatar: normalizeAvatar(setup?.avatar || pendingCharacterSetup?.avatar || currentAvatar || "🧙"),
      onTable: true,
    };
  } else if (setup) {
    data.rooms[room][currentUser].race = setup.race || data.rooms[room][currentUser].race;
    data.rooms[room][currentUser].class = setup.className || data.rooms[room][currentUser].class;
    data.rooms[room][currentUser].avatar = normalizeAvatar(setup.avatar || data.rooms[room][currentUser].avatar);
    data.rooms[room][currentUser].owner = setup.owner || data.rooms[room][currentUser].owner || normalizeEmail(currentAccountEmail) || "";
  }

  ensurePlayerSchema(data.rooms[room][currentUser]);
  recalcFromSheet(data.rooms[room][currentUser]);
  save(data);
}


loadRpgDatabases().finally(() => {
  ensureAllPlayersSchema();
  initAuth();
});

/* ================= GRID ================= */
const arena = document.getElementById("arena");
const mapViewport = document.getElementById("mapViewport");
const mapZoomInput = document.getElementById("mapZoom");
const artboardSelect = document.getElementById("artboardSelect");
let mapDragState = { active: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 };
let isSceneDockOpen = false;

function getSceneZoom() {
  const scene = load().scenes[room];
  return Number.isFinite(scene?.mapZoom) ? Math.max(0.5, Math.min(1.6, scene.mapZoom)) : 1;
}

function setMapZoom(nextZoom, options = {}) {
  const { keepCenter = true, anchorClientX = null, anchorClientY = null } = options;
  const clamped = Math.max(0.5, Math.min(1.6, Number(nextZoom) || 1));
  const data = load();
  if (!data.scenes[room]) data.scenes[room] = structuredClone(DEFAULT_SCENE);
  const viewportRect = mapViewport?.getBoundingClientRect?.() || null;
  const prevZoom = getSceneZoom();
  let centerRatioX = 0.5;
  let centerRatioY = 0.5;

  if (mapViewport && arena.offsetWidth && arena.offsetHeight) {
    if (anchorClientX != null && anchorClientY != null && viewportRect) {
      const anchorX = (mapViewport.scrollLeft + (anchorClientX - viewportRect.left)) / (arena.offsetWidth * prevZoom);
      const anchorY = (mapViewport.scrollTop + (anchorClientY - viewportRect.top)) / (arena.offsetHeight * prevZoom);
      centerRatioX = anchorX;
      centerRatioY = anchorY;
    } else if (keepCenter) {
      centerRatioX = (mapViewport.scrollLeft + mapViewport.clientWidth / 2) / (arena.offsetWidth * prevZoom);
      centerRatioY = (mapViewport.scrollTop + mapViewport.clientHeight / 2) / (arena.offsetHeight * prevZoom);
    }
  }

  data.scenes[room].mapZoom = clamped;
  save(data);
  applySceneCSS();

  if (mapZoomInput) mapZoomInput.value = String(Math.round(clamped * 100));

  if (mapViewport) {
    const w = arena.offsetWidth * clamped;
    const h = arena.offsetHeight * clamped;
    if (anchorClientX != null && anchorClientY != null && viewportRect) {
      mapViewport.scrollLeft = Math.max(0, w * centerRatioX - (anchorClientX - viewportRect.left));
      mapViewport.scrollTop = Math.max(0, h * centerRatioY - (anchorClientY - viewportRect.top));
    } else {
      mapViewport.scrollLeft = Math.max(0, w * centerRatioX - mapViewport.clientWidth / 2);
      mapViewport.scrollTop = Math.max(0, h * centerRatioY - mapViewport.clientHeight / 2);
    }
  }
}

function adjustMapZoom(delta) {
  setMapZoom(getSceneZoom() + delta);
}
window.adjustMapZoom = adjustMapZoom;

function bindMapInteractions() {
  if (mapZoomInput) {
    mapZoomInput.value = String(Math.round(getSceneZoom() * 100));
    mapZoomInput.addEventListener("input", () => {
      setMapZoom(parseInt(mapZoomInput.value, 10) / 100);
    });
  }

  if (!mapViewport) return;
  mapViewport.addEventListener("mousedown", (e) => {
    if (e.button !== 1 && e.button !== 0) return;
    if (e.target.closest(".token") || e.target.closest(".cell")) return;
    mapDragState = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: mapViewport.scrollLeft,
      scrollTop: mapViewport.scrollTop,
    };
    mapViewport.classList.add("dragging");
  });

  window.addEventListener("mousemove", (e) => {
    if (!mapDragState.active) return;
    mapViewport.scrollLeft = mapDragState.scrollLeft - (e.clientX - mapDragState.startX);
    mapViewport.scrollTop = mapDragState.scrollTop - (e.clientY - mapDragState.startY);
  });

  window.addEventListener("mouseup", () => {
    if (!mapDragState.active) return;
    mapDragState.active = false;
    mapViewport.classList.remove("dragging");
  });

  mapViewport.addEventListener("wheel", (e) => {
    if (e.target.closest("#sidebar")) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.06 : -0.06;
    setMapZoom(getSceneZoom() + delta, {
      keepCenter: false,
      anchorClientX: e.clientX,
      anchorClientY: e.clientY,
    });
  }, { passive: false });
}
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

  document.querySelectorAll('.sceneLayerSprite').forEach((el) => el.remove());
  const layerList = getSceneLayerList(s).filter((layer) => layer.visible !== false && layer.src);
  layerList.forEach((layer) => {
    const layerEl = document.createElement('div');
    layerEl.className = `sceneLayerSprite sceneLayer-${layer.kind || 'objects'}`;
    layerEl.style.left = `${layer.x * 40}px`;
    layerEl.style.top = `${layer.y * 40}px`;
    layerEl.style.width = `${Math.max(1, layer.width) * 40}px`;
    layerEl.style.height = `${Math.max(1, layer.height) * 40}px`;
    layerEl.style.opacity = `${Math.max(0, Math.min(100, layer.opacity ?? 100)) / 100}`;
    layerEl.style.zIndex = String(layer.kind === 'map' ? 1 : layer.kind === 'foreground' ? 4 : 3);

    const img = document.createElement('img');
    img.src = layer.src;
    img.alt = layer.name || 'Camada';
    img.loading = 'lazy';
    layerEl.appendChild(img);
    arena.appendChild(layerEl);
  });

  let cells = [...document.querySelectorAll(".cell")];
  // aplica tiles nas células
  for (const cell of cells) {
    const x = parseInt(cell.dataset.x, 10);
    const y = parseInt(cell.dataset.y, 10);
    const t = TILE_TYPES.includes(s.tiles[tileIndex(x, y)]) ? s.tiles[tileIndex(x, y)] : "floor";
    clearTileClasses(cell);
    cell.classList.add("tile-" + t);
    cell.innerHTML = "";
  }

  // tokens
  Object.keys(players).forEach((name) => {
    let p = players[name];
    ensurePlayerSchema(p);
    recalcFromSheet(p);

    p.x = Math.max(0, Math.min(s.cols - 1, Math.round(Number(p.x) || 0)));
    p.y = Math.max(0, Math.min(s.rows - 1, Math.round(Number(p.y) || 0)));

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

    let tokenStack = document.createElement("div");
    tokenStack.className = "tokenStack";
    tokenStack.dataset.player = name;

    let token = document.createElement("div");
    token.className = "token";
    token.style.background = p.color;
    const avatarEmoji = getAvatarEmoji(p.avatar || name[0].toUpperCase());
    token.innerHTML = "";
    if (isSpriteAvatar(p.avatar) || isIconAvatar(p.avatar)) {
      const sprite = document.createElement("img");
      sprite.className = "tokenSprite";
      sprite.src = p.avatar.url;
      sprite.alt = `${name} avatar`;
      sprite.loading = "lazy";
      sprite.onerror = () => {
        sprite.remove();
        token.textContent = avatarEmoji;
      };
      token.appendChild(sprite);
    } else {
      token.textContent = avatarEmoji;
    }

    token.onclick = (e) => {
      e.stopPropagation();
      showMenu(name, token);
    };

    token.title = `HP ${p.hp}/${p.hpMax} • MP ${p.mana}/${p.manaMax}`;

    let resources = document.createElement("div");
    resources.className = "tokenResources";

    // HP bar (em cima)
    let hpBar = document.createElement("div");
    hpBar.className = "bar barThin";
    let hpFill = document.createElement("div");
    hpFill.className = "hpFill";
    let hpPercent = p.hpMax > 0 ? (p.hp / p.hpMax) * 100 : 0;
    hpFill.style.width = hpPercent + "%";
    hpFill.style.background = hpColorFromPercent(hpPercent);
    hpBar.appendChild(hpFill);
    resources.appendChild(hpBar);

    // Mana bar (embaixo)
    let manaBar = document.createElement("div");
    manaBar.className = "bar barThin";
    let manaFill = document.createElement("div");
    manaFill.className = "manaFill";
    let manaPercent = p.manaMax > 0 ? (p.mana / p.manaMax) * 100 : 0;
    manaFill.style.width = manaPercent + "%";
    manaBar.appendChild(manaFill);
    resources.appendChild(manaBar);

    tokenStack.appendChild(token);
    tokenStack.appendChild(resources);
    if (p.player_shop?.enabled) {
      const badge = document.createElement("div");
      badge.className = "playerShopTokenBadge";
      badge.textContent = `${p.player_shop.icon || "🏪"}`;
      badge.title = "Loja disponível";
      badge.onclick = (evt) => {
        evt.stopPropagation();
        openPlayerShop(name, currentUser);
      };
      tokenStack.appendChild(badge);
    }

    cell.appendChild(tokenStack);
  });

  save(data);
  updateSidebar(players);
  renderCombatSpellSlots(players[currentUser]);

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

function getActionSourceBySlot(player, slotEntry) {
  if (!slotEntry || !player) return null;
  if (slotEntry.type === "ability") {
    const ability = (player.skills || []).find((skill) => String(skill.id || "").trim() === slotEntry.id && !skill.passive);
    if (!ability) return null;
    return { type: "ability", id: slotEntry.id, icon: ability.icon || "⚡", name: ability.name || "Habilidade", tooltip: abilityToCardHtml(ability) };
  }

  const spell = (player.customSpells || []).find((s) => s.id === slotEntry.id);
  if (!spell) return null;
  return { type: "spell", id: slotEntry.id, icon: spell.icon || "✨", name: spell.name || "Magia", tooltip: spellToCardHtml(spell) };
}

function buildSlotPickerOptions(player) {
  const spells = (player.customSpells || []).map((spell) => ({ type: "spell", id: spell.id, icon: spell.icon || "✨", name: spell.name || "Magia" }));
  const abilities = (player.skills || [])
    .filter((skill) => !skill.passive)
    .map((skill) => ({ type: "ability", id: String(skill.id || ""), icon: skill.icon || "⚡", name: skill.name || "Habilidade" }))
    .filter((entry) => entry.id);
  return [...spells, ...abilities];
}

function closeQuickSlotPicker() {
  const picker = document.getElementById("quickSlotPicker");
  if (picker) picker.remove();
  document.removeEventListener("click", closeQuickSlotPicker);
}

function openQuickSlotPicker(slotIndex, event = null) {
  const data = load();
  const player = data.rooms[room]?.[currentUser];
  if (!player) return;
  ensurePlayerSchema(player);

  const options = buildSlotPickerOptions(player);
  if (!options.length) {
    alert("Crie magias ou use habilidades ativas para preencher os slots rápidos.");
    return;
  }

  closeQuickSlotPicker();
  const picker = document.createElement("div");
  picker.id = "quickSlotPicker";
  picker.className = "quickSlotPicker";
  picker.onclick = (evt) => evt.stopPropagation();

  const header = document.createElement("div");
  header.className = "quickSlotPickerHeader";
  header.textContent = `Slot ${slotIndex + 1} · Selecione magia/habilidade`;
  picker.appendChild(header);

  const currentEntry = normalizeQuickSlotEntry(player.spellSlots?.[slotIndex]);
  if (currentEntry) {
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "quickSlotPickerBtn clear";
    clearBtn.textContent = "🧹 Limpar slot";
    clearBtn.onclick = () => {
      const latest = load();
      const current = latest.rooms[room]?.[currentUser];
      if (!current) return;
      ensurePlayerSchema(current);
      current.spellSlots[slotIndex] = null;
      save(latest);
      closeQuickSlotPicker();
      updateArena();
    };
    picker.appendChild(clearBtn);
  }

  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const isActive = currentEntry?.type === opt.type && currentEntry?.id === opt.id;
    btn.className = `quickSlotPickerBtn${isActive ? " active" : ""}`;
    btn.innerHTML = `<span>${opt.icon}</span><strong>${escapeHtml(opt.name)}</strong><small>${opt.type === "spell" ? "Magia" : "Habilidade"}</small>`;
    btn.onclick = () => {
      const latest = load();
      const current = latest.rooms[room]?.[currentUser];
      if (!current) return;
      ensurePlayerSchema(current);
      current.spellSlots[slotIndex] = { type: opt.type, id: opt.id };
      save(latest);
      closeQuickSlotPicker();
      updateArena();
    };
    picker.appendChild(btn);
  });

  document.body.appendChild(picker);

  const anchor = event?.currentTarget;
  const margin = 8;
  if (anchor && anchor.getBoundingClientRect) {
    const rect = anchor.getBoundingClientRect();
    const pickerRect = picker.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - pickerRect.width / 2;
    let top = rect.top - pickerRect.height - 10;
    if (top < margin) top = rect.bottom + 10;
    left = Math.max(margin, Math.min(left, window.innerWidth - pickerRect.width - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - pickerRect.height - margin));
    picker.style.left = `${left}px`;
    picker.style.top = `${top}px`;
  } else {
    picker.style.left = "50%";
    picker.style.top = "50%";
    picker.style.transform = "translate(-50%, -50%)";
  }

  setTimeout(() => {
    document.addEventListener("click", closeQuickSlotPicker);
  }, 0);
}

function moveQuickSlot(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  const data = load();
  const player = data.rooms[room]?.[currentUser];
  if (!player) return;
  ensurePlayerSchema(player);
  const slots = normalizeQuickSlots(player.spellSlots);
  const tmp = slots[fromIndex];
  slots[fromIndex] = slots[toIndex];
  slots[toIndex] = tmp;
  player.spellSlots = slots;
  save(data);
  updateArena();
}

function useQuickSlot(index, event) {
  if (event?.ctrlKey) return;

  const data = load();
  const player = data.rooms[room]?.[currentUser];
  if (!player) return;
  ensurePlayerSchema(player);

  const slots = normalizeQuickSlots(player.spellSlots);
  const slotEntry = slots[index];

  if (!slotEntry) {
    openQuickSlotPicker(index, event);
    return;
  }

  if (event?.shiftKey) {
    openQuickSlotPicker(index, event);
    return;
  }

  if (slotEntry.type === "ability") {
    useAbilityById(currentUser, slotEntry.id);
    return;
  }

  castSpellForPlayer(currentUser, slotEntry.id);
}

function renderCombatSpellSlots(player) {
  const wrap = document.getElementById("combatSpellSlots");
  if (!wrap) return;
  closeQuickSlotPicker();

  if (!player) {
    wrap.innerHTML = "";
    return;
  }

  ensurePlayerSchema(player);
  const slots = normalizeQuickSlots(player.spellSlots);
  wrap.innerHTML = slots.map((slotEntry, idx) => {
    const action = getActionSourceBySlot(player, slotEntry);
    if (!action) {
      return `<button class="combatSlot empty" type="button" title="Slot ${idx + 1} vazio. Clique para escolher." draggable="true" ondragstart="handleSlotDragStart(event, ${idx})" ondragover="handleSlotDragOver(event)" ondrop="handleSlotDrop(event, ${idx})" onclick="useQuickSlot(${idx}, event)">+</button>`;
    }
    const ctrlHint = 'Ctrl + arrastar para trocar ordem';
    const shiftHint = 'Shift + clique para trocar item';
    return `
      <button class="combatSlot" type="button" title="${escapeHtml(action.name)} • ${shiftHint} • ${ctrlHint}" draggable="true" ondragstart="handleSlotDragStart(event, ${idx})" ondragover="handleSlotDragOver(event)" ondrop="handleSlotDrop(event, ${idx})" onclick="useQuickSlot(${idx}, event)">
        <span class="slotIcon">${action.icon}</span>
        <span class="slotIndex">${idx + 1}</span>
        <div class="combatSlotTooltip">${action.tooltip}</div>
      </button>
    `;
  }).join("");
}

function handleSlotDragStart(event, fromIndex) {
  if (!event.ctrlKey) {
    event.preventDefault();
    return;
  }
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(fromIndex));
}

function handleSlotDragOver(event) {
  if (!event.ctrlKey) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function handleSlotDrop(event, toIndex) {
  if (!event.ctrlKey) return;
  event.preventDefault();
  const fromIndex = parseInt(event.dataTransfer.getData("text/plain"), 10);
  if (!Number.isInteger(fromIndex)) return;
  moveQuickSlot(fromIndex, toIndex);
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
    const labelName = String(p?.name || name);
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
        <div class="playerName">${labelName}${ownerTxt}</div>

        <div class="statRow">
          <div class="statLabel">HP</div>
          <div class="miniBar"><div class="miniHP" style="width:${hpPct}%; background:${hpColorFromPercent(hpPct)}"></div></div>
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

  const actions = [
    { icon: "🎒", title: "Inventário", run: () => openInventory(name) },
    { icon: "📜", title: "Ficha", run: () => openSheet(name) },
    { icon: "📖", title: "Grimório", run: () => openGrimoire(name) },
    { icon: "❤️", title: "HP (+/-)", run: () => editStat(name, "hp") },
    { icon: "🔵", title: "MP (+/-)", run: () => editStat(name, "mana") },
    { icon: "🗑️", title: "Remover da mesa", run: () => removeFromTable(name) },
    ...(load().rooms?.[room]?.[name]?.player_shop?.enabled ? [{ icon: "🏪", title: "Abrir Loja", run: () => openPlayerShop(name, currentUser) }] : []),
  ];

  actions.forEach((action) => {
    const btn = document.createElement("div");
    btn.className = "menuBtn";
    btn.title = action.title;
    btn.textContent = action.icon;
    btn.onclick = (evt) => {
      evt.stopPropagation();
      action.run();
    };
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);

  const rect = element.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const margin = 8;

  let left = rect.left + rect.width / 2 - menuRect.width / 2;
  let top = rect.top - menuRect.height - 10;

  if (top < margin) {
    top = rect.bottom + 10;
  }

  left = Math.max(margin, Math.min(left, window.innerWidth - menuRect.width - margin));
  top = Math.max(margin, Math.min(top, window.innerHeight - menuRect.height - margin));

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;

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

function closeAllCharacterModals() {
  const sheet = document.getElementById("sheetOverlay");
  const inv = document.getElementById("invOverlay");
  const grim = document.getElementById("grimoireOverlay");
  const dna = document.getElementById("sheetDnaOverlay");
  if (sheet) sheet.style.display = "none";
  if (inv) inv.style.display = "none";
  if (grim) grim.style.display = "none";
  if (dna) dna.style.display = "none";
  sheetTargetName = null;
  invTargetName = null;
  grimoireTargetName = null;
}

function openSheet(name) {
  if (!name) return;
  removeMenu();
  const invOpen = document.getElementById("invOverlay").style.display === "flex";
  const grimOpen = document.getElementById("grimoireOverlay").style.display === "flex";
  const dnaOpen = document.getElementById("sheetDnaOverlay")?.style.display === "flex";
  if (invOpen || grimOpen || dnaOpen) closeAllCharacterModals();

  let data = load();
  let p = data.rooms[room][name];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);
  save(data);

  sheetTargetName = name;

  const raceSel = document.getElementById("sheetRace");
  const bgInput = document.getElementById("sheetBackground");
  raceSel.innerHTML = Object.keys(RACES)
    .map((r) => `<option value="${r}">${r}</option>`)
    .join("");

  document.getElementById("sheetTitle").textContent = `Ficha — ${name}`;
  document.getElementById("sheetSub").textContent =
    `Equipados ficam aqui. Inventário/Loja ficam no 🎒.`;

  document.getElementById("sheetOwner").value = p.owner || "";
  raceSel.value = p.race;
  bgInput.value = p.background || "";

  renderClassRows(p);
  renderPointBuy(p);
  renderSheetComputed(p);
  renderSkills(p);
  renderEquip(p);
  renderAbilities(p);
  renderDnaSummary(p);

  raceSel.onchange = () => previewSheet();
  bgInput.oninput = () => previewSheet();

  document.getElementById("sheetOverlay").style.display = "flex";
}

function readClassesFromUI() {
  const rows = Array.from(document.querySelectorAll(".sheetClassRow"));
  const fallbackClass = Object.keys(CLASSES)[0] || "Guerreiro";
  const parsed = rows
    .map((row) => {
      const classSelect = row.querySelector("select[data-class-id]");
      const levelInput = row.querySelector("input[data-class-level]");
      return {
        classId: classSelect?.value || fallbackClass,
        level: Math.max(1, parseInt(levelInput?.value || "1", 10) || 1),
      };
    })
    .filter((entry) => CLASSES[entry.classId]);
  return parsed.length ? parsed : [{ classId: fallbackClass, level: 1 }];
}

function renderClassRows(p) {
  const wrap = document.getElementById("sheetClassRows");
  if (!wrap) return;
  p.classes = normalizeMulticlassEntries(p);

  wrap.innerHTML = p.classes
    .map((entry, idx) => {
      const options = Object.keys(CLASSES)
        .map((className) => `<option value="${className}" ${className === entry.classId ? "selected" : ""}>${className}</option>`)
        .join("");
      const removeBtn = idx > 0 ? `<button type="button" class="smallBtn" data-remove-class="${idx}">−</button>` : "";
      return `
        <div class="sheetClassRow">
          <select data-class-id>${options}</select>
          <input data-class-level type="number" min="1" max="20" step="1" value="${entry.level}" />
          ${removeBtn}
        </div>
      `;
    })
    .join("");

  const addBtn = document.getElementById("addSheetClassBtn");
  if (addBtn) {
    addBtn.onclick = () => {
      const current = readClassesFromUI();
      current.push({ classId: Object.keys(CLASSES)[0] || "Guerreiro", level: 1 });
      p.classes = current;
      renderClassRows(p);
      previewSheet();
    };
  }

  wrap.querySelectorAll("select[data-class-id], input[data-class-level]").forEach((el) => {
    el.onchange = () => previewSheet();
    el.oninput = () => previewSheet();
  });

  wrap.querySelectorAll("button[data-remove-class]").forEach((btn) => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.removeClass, 10);
      const current = readClassesFromUI();
      current.splice(idx, 1);
      p.classes = current;
      renderClassRows(p);
      previewSheet();
    };
  });

  const totalLevelInput = document.getElementById("sheetLevel");
  if (totalLevelInput) totalLevelInput.value = String(getTotalClassLevel(readClassesFromUI()));
}

function previewSheet() {
  if (!sheetTargetName) return;
  let data = load();
  let p = data.rooms[room][sheetTargetName];
  if (!p) return;
  ensurePlayerSchema(p);

  p.race = document.getElementById("sheetRace").value;
  p.background = (document.getElementById("sheetBackground").value || "").trim() || "Nenhum";
  p.classes = readClassesFromUI();
  p.attributeScores = readPointBuyFromUI();
  const { profs, exps } = collectSkillFlags();
  p.skillProficiencies = profs;
  p.expertiseSkills = exps;
  recalcFromSheet(p);
  save(data);

  renderPointBuy(p);
  renderSheetComputed(p);
  renderSkills(p);
  renderEquip(p);
  renderAbilities(p);
  renderDnaSummary(p);
  updateArena();
}

function readPointBuyFromUI() {
  const scores = defaultAttributeScores();
  ATTRIBUTES.forEach((attr) => {
    const input = document.getElementById(`attrScore_${attr.id}`);
    scores[attr.id] = normalizeScore(input ? input.value : 8);
  });
  return scores;
}

function renderPointBuy(p) {
  const wrap = document.getElementById("sheetPointBuy");
  wrap.innerHTML = ATTRIBUTES.map((attr) => {
    const score = p.attributeScores[attr.id];
    return `
      <div class="pointRow">
        <div class="pointLabel">${attr.short}</div>
        <input id="attrScore_${attr.id}" type="number" min="8" max="15" step="1" value="${score}" />
      </div>
    `;
  }).join("");

  ATTRIBUTES.forEach((attr) => {
    const input = document.getElementById(`attrScore_${attr.id}`);
    if (input) input.oninput = () => previewSheet();
  });
}

function renderSkills(p) {
  const profSet = new Set(p.skillProficiencies || []);
  const expSet = new Set(p.expertiseSkills || []);
  const prof = p.proficiencyBonus || 2;
  const wrap = document.getElementById("sheetSkills");
  const classSuggested = new Set((p.classes || []).flatMap((entry) => getClassSuggestedSkills(entry.classId)));

  wrap.innerHTML = SKILLS.map((skill) => {
    const trained = profSet.has(skill.id);
    const expert = expSet.has(skill.id);
    const attrMod = p.attributeMods[skill.ability] || 0;
    const bonus = attrMod + (expert ? prof * 2 : trained ? prof : 0);
    const classHint = classSuggested.has(skill.id) ? "Sugestão de classe" : "";
    return `
      <label class="skillRow">
        <div class="skillMain">
          <input type="checkbox" data-skill-prof="${skill.id}" ${trained ? "checked" : ""} />
          <span>${skill.name}</span>
          <small>(${abilityShort(skill.ability)})</small>
          ${classSuggested.has(skill.id) ? '<span class="bonusTag" title="Perícia sugerida automaticamente pela classe">classe</span>' : ""}
        </div>
        <div class="skillMeta">
          <input type="checkbox" data-skill-exp="${skill.id}" ${expert ? "checked" : ""} ${trained ? "" : "disabled"} title="Especialização" />
          <strong class="${classSuggested.has(skill.id) ? "bonusValue" : ""}" title="${classHint}">${fmtMod(bonus)}</strong>
        </div>
      </label>
    `;
  }).join("");

  wrap.querySelectorAll("input[data-skill-prof]").forEach((el) => {
    el.onchange = () => previewSheet();
  });
  wrap.querySelectorAll("input[data-skill-exp]").forEach((el) => {
    el.onchange = () => previewSheet();
  });
}

function collectSkillFlags() {

  const profs = [];
  const exps = [];
  document.querySelectorAll("input[data-skill-prof]").forEach((el) => {
    if (el.checked) profs.push(el.dataset.skillProf);
  });
  document.querySelectorAll("input[data-skill-exp]").forEach((el) => {
    if (el.checked) exps.push(el.dataset.skillExp);
  });
  return { profs, exps };
}

function renderSheetComputed(p) {
  const hpPct = p.hpMax > 0 ? (p.hp / p.hpMax) * 100 : 0;
  const mpPct = p.manaMax > 0 ? (p.mana / p.manaMax) * 100 : 0;

  const avatarNode = document.getElementById("sheetAvatarBadge");
  if (avatarNode) {
    const avatarEmoji = getAvatarEmoji(p.avatar || "🧙");
    avatarNode.innerHTML = "";
    if (isSpriteAvatar(p.avatar) || isIconAvatar(p.avatar)) {
      avatarNode.innerHTML = `<img src="${p.avatar.url}" alt="Avatar" loading="lazy" />`;
    } else {
      avatarNode.textContent = avatarEmoji;
    }
  }

  const heroName = document.getElementById("sheetHeroName");
  const heroClass = document.getElementById("sheetHeroClass");
  if (heroName) heroName.textContent = sheetTargetName || "Personagem";
  if (heroClass) heroClass.textContent = `${p.race} • ${(p.classes || []).map((entry) => `${entry.classId} ${entry.level}`).join(" / ")}`;

  const bonusInfo = computeSheetBonusBreakdown(p);
  const statMap = [
    ["statSTR", "str"],
    ["statDEX", "dex"],
    ["statCON", "con"],
    ["statINT", "int"],
    ["statWIS", "wis"],
    ["statCHA", "cha"],
  ];
  statMap.forEach(([id, key]) => {
    const el = document.getElementById(id);
    const lines = bonusInfo.byAttr[key] || [];
    el.textContent = fmtMod(p.attributeMods[key] || 0);
    el.classList.toggle("bonusValue", lines.length > 0);
    el.title = lines.length ? lines.join(" • ") : "Sem bônus externos";
  });

  document.getElementById("statProf").textContent = fmtMod(p.proficiencyBonus || 2);
  const defEl = document.getElementById("statDEF");
  defEl.textContent = p.defense ?? 10 + (p.attributeMods.dex || 0);
  defEl.classList.toggle("bonusValue", bonusInfo.defenseBonus > 0);
  defEl.title = bonusInfo.defenseBonus > 0 ? `Bônus de itens: +${bonusInfo.defenseBonus}` : "Sem bônus externos";
  const hpMaxEl = document.getElementById("statHPMax");
  const mpMaxEl = document.getElementById("statMPMax");
  hpMaxEl.textContent = p.hpMax;
  mpMaxEl.textContent = p.manaMax;
  hpMaxEl.classList.toggle("bonusValue", bonusInfo.hpBonus > 0);
  mpMaxEl.classList.toggle("bonusValue", bonusInfo.manaBonus > 0);
  hpMaxEl.title = bonusInfo.hpBonus > 0 ? `Bônus de itens: +${bonusInfo.hpBonus}` : "Sem bônus externos";
  mpMaxEl.title = bonusInfo.manaBonus > 0 ? `Bônus de itens: +${bonusInfo.manaBonus}` : "Sem bônus externos";
  document.getElementById("statHPNow").textContent = p.hp;
  document.getElementById("statMPNow").textContent = p.mana;

  const hpFill = document.getElementById("sheetHpFill");
  const mpFill = document.getElementById("sheetManaFill");
  if (hpFill) {
    const hpSafePct = Math.max(0, Math.min(100, hpPct));
    hpFill.style.width = `${hpSafePct}%`;
    hpFill.style.background = hpColorFromPercent(hpSafePct);
  }
  if (mpFill) mpFill.style.width = `${Math.max(0, Math.min(100, mpPct))}%`;

  const used = totalPointBuyCost(p.attributeScores || defaultAttributeScores());
  document.getElementById("pointBuyUsed").textContent = `${used}/${POINT_BUY_BUDGET}`;
  document.getElementById("pointBuyUsed").className = used > POINT_BUY_BUDGET ? "warn" : "";
}

function renderAbilities(p) {
  const list = document.getElementById("sheetAbilities");
  const skills = p.skills || [];

  function hexToRgba(hex, alpha) {
    const clean = String(hex || "").trim().replace("#", "");
    if (!clean) return "";
    const full = clean.length === 3 ? clean.split("").map((ch) => ch + ch).join("") : clean;
    if (!/^[0-9a-fA-F]{6}$/.test(full)) return "";
    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function getRaceAccentFromSkill(skill) {
    const sourceRaceName = String(skill?.sourceName || p?.race || "").trim();
    const raceData = RACES[sourceRaceName] || RACES[p?.race] || null;
    const hex = raceData?.dna?.ui?.cor_hex || "";
    return {
      border: hexToRgba(hex, 0.68),
      glow: hexToRgba(hex, 0.24),
      bg: hexToRgba(hex, 0.09),
    };
  }

  const racialSkills = skills
    .map((skill, idx) => ({ skill, idx }))
    .filter((entry) => entry.skill.sourceType === "race");
  const classSkills = skills
    .map((skill, idx) => ({ skill, idx }))
    .filter((entry) => entry.skill.sourceType !== "race");

  function renderAbilityGroup(title, entries, groupType) {
    if (!entries.length) return "";
    return `
      <div class="abilityGroupTitle">${title}</div>
      <div class="abilityGroupList">
        ${entries
          .map(({ skill, idx }) => {
            const isPassive = Boolean(skill.passive);
            const cost = parseInt(skill.manaCost || 0, 10) || 0;
            const raceAccent = groupType === "race" ? getRaceAccentFromSkill(skill) : null;
            const interactiveAttrs = isPassive
              ? ""
              : `onclick="useAbility(${idx})" role="button" tabindex="0" onkeydown="handleAbilityKeydown(event, ${idx})"`;
            const raceStyle = raceAccent?.border
              ? `style="--race-accent-border:${raceAccent.border};--race-accent-glow:${raceAccent.glow};--race-accent-bg:${raceAccent.bg};"`
              : "";
            return `
              <div class="abilityItem ${isPassive ? "isPassive" : "isAction"} ${groupType === "race" ? "isRace" : ""}" ${raceStyle} ${interactiveAttrs}>
                <div class="abilityName">${skill.name}${isPassive ? ' <small class="abilityTagPassive">Passiva</small>' : ""}</div>
                <div class="abilityDesc"><strong>Detalhe:</strong> ${skill.desc}</div>
                <div class="abilityMeta"><strong>Custo:</strong> ${cost} MP</div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  list.innerHTML = `
    ${renderAbilityGroup("Classe", classSkills, "class")}
    ${renderAbilityGroup("Raciais", racialSkills, "race")}
  `;
}

function abilityToCardHtml(ability) {
  const cost = parseInt(ability?.manaCost || 0, 10) || 0;
  const origin = ability?.sourceType === "race" ? "Habilidade Racial" : "Habilidade de Classe";
  return `
    <div class="spellCard">
      <div class="spellHead">
        <strong>${escapeHtml(ability?.icon || "⚡")} ${escapeHtml(ability?.name || "Habilidade")}</strong>
        <span>${origin}</span>
      </div>
      <div class="spellBody">${escapeHtml(ability?.desc || "Sem descrição")}</div>
      <div class="spellFooter">
        <span>Custo: ${cost} MP</span>
      </div>
    </div>
  `;
}

function handleAbilityKeydown(event, skillIndex) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  useAbility(skillIndex);
}

function useAbilityById(playerName, abilityId) {
  if (!playerName || !abilityId) return;
  let data = load();
  let p = data.rooms[room][playerName];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);

  const skills = p.skills || [];
  const a = skills.find((skill) => String(skill.id || "").trim() === String(abilityId).trim());
  if (!a || a.passive) return;

  const cost = parseInt(a.manaCost || 0, 10) || 0;
  if (cost > 0 && p.mana < cost) {
    alert("Mana insuficiente!");
    return;
  }

  p.mana = Math.max(0, p.mana - cost);
  save(data);

  pushChat(currentUser, `* ${playerName} ativou ${a.icon} ${a.name}.`, {
    spellCast: {
      spell: {
        icon: a.icon || "✨",
        name: a.name,
        level: a.level || 1,
        description: a.desc || "",
        school: a.sourceType === "race" ? "Habilidade Racial" : "Habilidade de Classe",
        castingTime: "Ação",
        range: "—",
        components: [],
        duration: "Instantâneo",
        effects: [],
      },
      slotLevel: 0,
      rollText: null,
      detailsText: [
        a.sourceType === "race" ? "Origem: Raça" : "Origem: Classe",
        cost > 0 ? `Custo: ${cost} MP` : "Sem custo de mana",
      ].join(" • "),
    },
  });
  updateArena();

  if (sheetTargetName === playerName) {
    renderSheetComputed(p);
    renderEquip(p);
    renderAbilities(p);
    renderDnaSummary(p);
  }
}

function useAbility(skillIndex) {
  if (!sheetTargetName) return;
  const data = load();
  const p = data.rooms[room][sheetTargetName];
  if (!p) return;
  ensurePlayerSchema(p);
  const skill = (p.skills || [])[skillIndex];
  if (!skill) return;
  useAbilityById(sheetTargetName, skill.id);
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
      <button class="smallBtn" title="Desequipar" aria-label="Desequipar ${label}" onclick="unequip('${sheetTargetName}','${slot}')">−</button>
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
  renderDnaSummary(p);
  updateArena();
}

function formatRaceSizeLabel(size) {
  const value = String(size || "").trim().toLowerCase();
  if (value === "pequeno") return "Pequeno";
  if (value === "medio" || value === "médio") return "Médio";
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function extractRaceLongLifeFromAbilities(raceData) {
  const abilities = Array.isArray(raceData?.abilities) ? raceData.abilities : [];
  for (const ability of abilities) {
    const text = `${ability?.name || ""} ${ability?.desc || ""}`.toLowerCase();
    if (text.includes("longevid") || text.includes("vive") || text.includes("anos")) {
      return String(ability?.desc || "").trim();
    }
  }
  return "—";
}

function getRaceSummaryDetails(raceName) {
  const byName = RACES?.[raceName] || null;
  const ficha = byName?.dna?.ficha || null;
  const sizeLabel = formatRaceSizeLabel(ficha?.tamanho || byName?.size);
  const speedMeters = Number(ficha?.deslocamento_m);
  const speedText = Number.isFinite(speedMeters) ? `${speedMeters}m` : "—";
  const fixedLangs = Array.isArray(ficha?.idiomas?.fixos) ? ficha.idiomas.fixos : [];
  const choice = ficha?.idiomas?.escolha;
  const langs = [...fixedLangs];
  if ((choice?.quantidade || 0) > 0) {
    if (choice?.opcoes === "qualquer") langs.push(`${choice.quantidade} qualquer`);
    else if (Array.isArray(choice?.opcoes) && choice.opcoes.length) langs.push(`${choice.quantidade} (${choice.opcoes.join("/")})`);
  }
  const languages = langs.length ? langs.join(", ") : "—";
  const age = Number.isFinite(Number(ficha?.expectativa_vida_ate))
    ? `até ${ficha.expectativa_vida_ate} anos`
    : String(byName?.age || "").trim() || extractRaceLongLifeFromAbilities(byName);
  const height = ficha?.altura_cm ? `${ficha.altura_cm.min}-${ficha.altura_cm.max} cm` : String(byName?.height || "").trim() || "—";
  const weight = ficha?.peso_kg ? `${ficha.peso_kg.min}-${ficha.peso_kg.max} kg` : String(byName?.weight || "").trim() || "—";
  return { sizeLabel, speedText, languages, age, height, weight };
}

function renderDnaSummary(p) {
  const wrap = document.getElementById("sheetDnaSummary");
  if (!wrap) return;
  const bg = (p.background || "Nenhum").trim() || "Nenhum";
  const used = totalPointBuyCost(p.attributeScores || defaultAttributeScores());
  const race = getRaceSummaryDetails(p.race || "");
  wrap.innerHTML = `
    <div class="kv"><span>Background</span><strong class="sheetClampText" title="${bg}">${bg}</strong></div>
    <div class="kv"><span>Point Buy</span><strong>${used}/${POINT_BUY_BUDGET}</strong></div>
    <div class="kv"><span>Tamanho</span><strong>${race.sizeLabel}</strong></div>
    <div class="kv"><span>Deslocamento</span><strong>${race.speedText}</strong></div>
    <div class="kv"><span>Altura</span><strong>${race.height}</strong></div>
    <div class="kv"><span>Peso</span><strong>${race.weight}</strong></div>
    <div class="kv"><span>Longevidade</span><strong>${race.age}</strong></div>
    <div class="kv"><span>Idiomas</span><strong class="sheetClampText" title="${race.languages}">${race.languages}</strong></div>
  `;
}

function openSheetDna() {
  if (!sheetTargetName) return;
  const overlay = document.getElementById("sheetDnaOverlay");
  if (!overlay) return;
  overlay.style.display = "flex";
}

function closeSheetDna() {
  const overlay = document.getElementById("sheetDnaOverlay");
  if (!overlay) return;
  overlay.style.display = "none";
}

function saveSheetDna() {
  saveSheet(false);
  closeSheetDna();
  if (sheetTargetName) {
    const overlay = document.getElementById("sheetOverlay");
    if (overlay) overlay.style.display = "flex";
  }
}

function saveSheet(closeAfterSave = true) {
  if (!sheetTargetName) return;
  let data = load();
  let p = data.rooms[room][sheetTargetName];
  if (!p) return;

  ensurePlayerSchema(p);

  p.owner = document.getElementById("sheetOwner").value || "";
  p.race = document.getElementById("sheetRace").value;
  p.classes = readClassesFromUI();
  p.background = (document.getElementById("sheetBackground").value || "").trim() || "Nenhum";
  p.attributeScores = readPointBuyFromUI();
  const { profs, exps } = collectSkillFlags();
  p.skillProficiencies = profs;
  p.expertiseSkills = exps;

  recalcFromSheet(p);
  save(data);

  if (closeAfterSave) closeSheet();
  renderDnaSummary(p);
  updateArena();
}
function closeSheet() {
  document.getElementById("sheetOverlay").style.display = "none";
  const dna = document.getElementById("sheetDnaOverlay");
  if (dna) dna.style.display = "none";
  sheetTargetName = null;
}

/* ================= GRIMÓRIO / MAGIAS CUSTOM ================= */
function getSpellCreationLimit(level) {
  for (const row of SPELL_CREATION_LEVEL_LIMITS) {
    if (level >= row.minLevel && level <= row.maxLevel) return row.points;
  }
  return 10;
}

function syncSpellcasting(p) {
  if (!p.spellcasting || typeof p.spellcasting !== "object") p.spellcasting = {};
  p.spellcasting.slotsMax = [];
  p.spellcasting.slotsCurrent = [];
}

function openGrimoire(name) {
  const data = load();
  const p = data.rooms[room][name];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);
  save(data);

  grimoireTargetName = name;
  document.getElementById("grimoireTitle").textContent = `Grimório — ${name}`;
  document.getElementById("grimoireSub").textContent = "Crie magias homebrew por pontos e conjure usando apenas PM disponível.";
  document.getElementById("grimoireOverlay").style.display = "flex";

  setupGrimoireFormDefaults();
  renderGrimoire(p);
}

function closeGrimoire() {
  document.getElementById("grimoireOverlay").style.display = "none";
  grimoireTargetName = null;
  activeGrimoireTab = "spells";
}

function openMyGrimoire() {
  openGrimoire(currentUser);
}

function setGrimoireTab(tabId) {
  activeGrimoireTab = tabId;
  applyGrimoireTabState();
}

function applyGrimoireTabState() {
  const tabs = document.querySelectorAll(".grimoireTab");
  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === activeGrimoireTab;
    tab.classList.toggle("active", Boolean(isActive));
    tab.setAttribute("aria-selected", String(Boolean(isActive)));
  });

  const panels = document.querySelectorAll(".grimoirePanel");
  panels.forEach((panel) => {
    const isActive = panel.dataset.tab === activeGrimoireTab;
    panel.style.display = isActive ? "block" : "none";
  });
}

function setupGrimoireFormDefaults() {
  const recalc = () => refreshSpellCostSummary();
  ["spellName", "spellLevel", "spellCastingTime", "spellRange", "spellDescription", "compV", "compS", "compM"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.oninput = recalc;
    if (el && el.type === "checkbox") el.onchange = recalc;
  });

  renderSpellIconLibrary();
  applyGrimoireTabState();
}

function renderGrimoire(p) {
  renderSpellMeta(p);
  renderSpellSlots(p);
  renderSpellEffectsCatalog();
  renderCustomSpells(p);
  refreshSpellCostSummary();
}

function renderSpellMeta(p) {
  const meta = document.getElementById("grimoireMeta");
  const limit = getSpellCreationLimit(p.level || 1);

  meta.innerHTML = `
    <div class="kv"><span>Nível do personagem</span><strong>${p.level}</strong></div>
    <div class="kv"><span>Pontos de criação</span><strong>${limit}</strong></div>
    <div class="kv"><span>Maior círculo disponível</span><strong>9 (limitado apenas por PM)</strong></div>
    <div class="kv"><span>Magias customizadas</span><strong>${(p.customSpells || []).length}</strong></div>
  `;

  const spellLevelInput = document.getElementById("spellLevel");
  spellLevelInput.max = "9";
  const val = parseInt(spellLevelInput.value || "1", 10);
  if (Number.isNaN(val) || val > 9 || val < 1) {
    spellLevelInput.value = String(Math.min(9, Math.max(1, val || 1)));
  }
}

function renderSpellSlots(p) {
  const wrap = document.getElementById("grimoireSlots");
  wrap.innerHTML = '<div style="opacity:.7">Sem slots: conjuração usa apenas PM atual.</div>';
}

function renderSpellEffectsCatalog() {
  const box = document.getElementById("spellEffectsCatalog");
  box.innerHTML = SPELL_EFFECTS_CATALOG.map((fx) => `
    <div class="effectCard">
      <div><strong>${fx.name}</strong> <span style="opacity:.7">(${fx.baseCost} pts base)</span></div>
      <div style="opacity:.75; font-size:12px;">Escala: ${fx.unitLabel} custa +${fx.unitCost} pts (máx ${fx.maxUnits})</div>
      <div class="effectRow">
        <label>Intensidade</label>
        <input type="number" min="0" max="${fx.maxUnits}" value="0" id="effect_${fx.id}" oninput="refreshSpellCostSummary()" />
      </div>
    </div>
  `).join("");
}

function renderSpellIconLibrary() {
  const box = document.getElementById("spellIconLibrary");
  if (!box) return;

  box.innerHTML = SPELL_ICON_LIBRARY.map((icon) => {
    const active = selectedSpellIcon === icon ? " active" : "";
    return `<button type="button" class="iconChip${active}" onclick="selectSpellIcon('${icon}')">${icon}</button>`;
  }).join("");
}

function selectSpellIcon(icon) {
  selectedSpellIcon = icon;
  renderSpellIconLibrary();
}

function getSelectedEffects() {
  return SPELL_EFFECTS_CATALOG.map((fx) => {
    const el = document.getElementById(`effect_${fx.id}`);
    const units = Math.max(0, Math.min(fx.maxUnits, parseInt(el?.value || "0", 10) || 0));
    return { fx, units };
  }).filter((x) => x.units > 0);
}

function computeSpellDraftCost() {
  const selected = getSelectedEffects();
  const total = selected.reduce((sum, item) => sum + item.fx.baseCost + item.units * item.fx.unitCost, 0);
  return { selected, total };
}

function refreshSpellCostSummary() {
  if (!grimoireTargetName) return;
  const data = load();
  const p = data.rooms[room][grimoireTargetName];
  if (!p) return;
  const limit = getSpellCreationLimit(p.level || 1);
  const { selected, total } = computeSpellDraftCost();

  const details = selected.length
    ? selected.map((s) => `${s.fx.name}: ${s.fx.baseCost} + (${s.units}×${s.fx.unitCost}) = <strong>${s.fx.baseCost + s.units * s.fx.unitCost}</strong>`).join("<br>")
    : "Nenhum efeito selecionado.";

  document.getElementById("spellCostSummary").innerHTML = `
    <div><strong>Custo total:</strong> ${total} / ${limit} pontos</div>
    <div style="margin-top:6px; opacity:.85; font-size:12px;">${details}</div>
  `;
}

function buildCustomSpellEffects(selected) {
  return selected.map(({ fx, units }) => {
    if (fx.type === "dano") {
      return { type: "dano", damageDice: `${units}d6`, damageType: fx.defaultDamageType, area: "alvo único" };
    }
    if (fx.type === "cura") {
      return { type: "cura", healDice: `${units}d8` };
    }
    if (fx.type === "controle") {
      return { type: "status", effect: fx.status, duration: `${units} turnos` };
    }
    if (fx.type === "buff") {
      return { type: "buff", stat: fx.stat, bonus: units, duration: "1 turno" };
    }
    if (fx.type === "debuff") {
      return { type: "debuff", stat: fx.stat, penalty: units, duration: "1 turno" };
    }
    return { type: "invocacao", creaturePower: units, duration: `${units} turnos` };
  });
}

function createCustomSpell() {
  if (!grimoireTargetName) return;
  const data = load();
  const p = data.rooms[room][grimoireTargetName];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);

  const name = (document.getElementById("spellName").value || "").trim();
  const level = parseInt(document.getElementById("spellLevel").value || "1", 10) || 1;
  const limit = getSpellCreationLimit(p.level || 1);
  const castingTime = (document.getElementById("spellCastingTime").value || "1 ação").trim();
  const range = (document.getElementById("spellRange").value || "18m").trim();
  const description = (document.getElementById("spellDescription").value || "").trim();

  const { selected, total } = computeSpellDraftCost();
  if (!name) return alert("Dê um nome para a magia.");
  if (selected.length === 0) return alert("Selecione ao menos 1 efeito.");
  if (level > 9 || level < 1) return alert("Círculo inválido. Use um valor entre 1 e 9.");
  if (total > limit) return alert(`Custo excede o limite de criação (${limit} pontos).`);

  const components = [];
  if (document.getElementById("compV").checked) components.push("V");
  if (document.getElementById("compS").checked) components.push("S");
  if (document.getElementById("compM").checked) components.push("M");

  const spell = {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    icon: selectedSpellIcon,
    name,
    level,
    creatorLevel: p.level,
    effects: buildCustomSpellEffects(selected),
    pointCost: total,
    castingTime,
    range,
    components,
    description,
    rules: {
      usesSpellSlots: false,
      preparedType: ["Mago", "Feiticeiro"].includes(p.class) ? "known" : "prepared",
    },
  };

  p.customSpells.push(spell);
  save(data);

  pushAction(currentUser, `${grimoireTargetName} criou a magia customizada 📖 ${spell.name} (Nível ${spell.level}, custo ${spell.pointCost} pts).`);
  renderGrimoire(p);
  updateArena();
}

function renderCustomSpells(p) {
  const box = document.getElementById("customSpellsList");
  const spells = p.customSpells || [];
  if (spells.length === 0) {
    box.innerHTML = '<div style="opacity:.7; font-size:12px;">Nenhuma magia customizada ainda.</div>';
    return;
  }

  box.innerHTML = spells.map((spell) => {
    const equippedAt = normalizeQuickSlots(p.spellSlots).findIndex((entry) => entry?.type === "spell" && entry?.id === spell.id);
    const equipLabel = equippedAt >= 0 ? `No slot ${equippedAt + 1}` : "Enviar para slot";
    return `
      ${spellToCardHtml(spell)}
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:10px;">
        <button class="smallBtn" onclick="bindSpellToSlot('${spell.id}')">${equipLabel}</button>
        <button class="smallBtn" onclick="castCustomSpell('${spell.id}')">Conjurar</button>
      </div>
    `;
  }).join("");
}

function bindSpellToSlot(spellId) {
  if (!grimoireTargetName) return;
  const data = load();
  const p = data.rooms[room][grimoireTargetName];
  if (!p) return;

  ensurePlayerSchema(p);

  const currentIdx = normalizeQuickSlots(p.spellSlots).findIndex((entry) => entry?.type === "spell" && entry?.id === spellId);
  if (currentIdx >= 0) {
    p.spellSlots[currentIdx] = null;
    save(data);
    renderGrimoire(p);
    updateArena();
    return;
  }

  const freeIdx = normalizeQuickSlots(p.spellSlots).findIndex((entry) => !entry);
  if (freeIdx < 0) {
    alert("Todos os slots rápidos estão ocupados.");
    return;
  }
  p.spellSlots[freeIdx] = { type: "spell", id: spellId };
  save(data);
  renderGrimoire(p);
  updateArena();
}

function castCustomSpell(spellId) {
  if (!grimoireTargetName) return;
  castSpellForPlayer(grimoireTargetName, spellId);
}

function resetSpellSlots(name) {
  const target = name || grimoireTargetName || currentUser;
  if (!target) return;
  alert(`${target} não usa slots de magia: a conjuração é limitada apenas por PM disponível.`);
}

/* ================= INVENTÁRIO + LOJA ================= */
function openInventory(name) {
  let data = load();
  let p = data.rooms[room][name];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);
  save(data);

  invTargetName = name;
  selectedShopId = "taberna";
  selectedArsenalType = "weapon";
  pendingUpgradeId = null;

  document.getElementById("invTitle").textContent = `Inventário — ${name}`;
  document.getElementById("invSub").textContent =
    `Ações via menu ⋯. Loja com ouro. Itens equipados refletem na ficha.`;

  document.getElementById("invOverlay").style.display = "flex";
  try {
    renderInventoryModal(p);
  } catch (err) {
    console.error("Falha ao abrir inventário:", err);
    document.getElementById("invList").innerHTML =
      `<div style="opacity:.8;font-size:12px;">Não foi possível renderizar o inventário deste personagem.</div>`;
    document.getElementById("shopList").innerHTML = "";
  }
}
function closeInventory() {
  document.getElementById("invOverlay").style.display = "none";
  invTargetName = null;
  pendingUpgradeId = null;
  removeMiniMenu();
}
function renderInventoryModal(p) {
  document.getElementById("goldValue").textContent = p.gold ?? 0;
  document.getElementById("invSlotsValue").textContent =
    `${invCount(p)}/${invMax(p)}`;
  renderInvList(p);
  renderShop(p);
}

function resolveInventoryItem(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return ITEM_DB[entry] || null;
  if (typeof entry === "object") return entry;
  return null;
}

function renderInvList(p) {
  const box = document.getElementById("invList");
  const inv = p.inventory || [];
  if (inv.length === 0) {
    box.innerHTML = `<div style="opacity:.7;font-size:12px;">Inventário vazio.</div>`;
    return;
  }
  box.innerHTML = inv
    .map((entry, idx) => {
      const it = resolveInventoryItem(entry);
      if (!it) return "";
      return `
      <div class="invItem" data-idx="${idx}">
        <div class="invIcon">${it.icon || "📦"}</div>
        <div style="flex:1;">
          <div class="invName">${it.name || "Item"}</div>
          <div class="invDesc">${it.desc || it.description || "Sem descrição."}</div>
        </div>
        <button class="dotBtn" title="Ações" onclick="openItemMenu(event,${idx})">⋯</button>
      </div>
    `;
    })
    .join("");
}

function iconForShopItem(item) {
  const iconMap = {
    rope: "🪢",
    anvil: "🔨",
    sword: "⚔️",
    shield: "🛡️",
    armor: "🥋",
    backpack: "🎒",
  };
  if (item.icon && item.icon.length <= 3) return item.icon;
  if (iconMap[item.icon]) return iconMap[item.icon];
  if (item.type === "weapon") return "⚔️";
  if (item.type === "armor") return "🥋";
  if (item.type === "shield") return "🛡️";
  if (item.type === "upgrade") return "🔨";
  if (item.type === "consumable" || item.type === "utility") return "🎒";
  return "📦";
}

function renderShopTabs() {
  const tabs = document.getElementById("shopTabs");
  tabs.innerHTML = SHOP_TABS.map((tab) => `
    <button class="smallBtn ${selectedShopId === tab.id ? "smallBtnPrimary" : ""}" onclick="selectShop('${tab.id}')">${tab.label}</button>
  `).join("");
}

function selectShop(shopId) {
  selectedShopId = shopId;
  pendingUpgradeId = null;
  const p = load().rooms[room][invTargetName];
  if (!p) return;
  renderInventoryModal(p);
}

function selectArsenalType(type) {
  selectedArsenalType = type;
  const p = load().rooms[room][invTargetName];
  if (!p) return;
  renderShop(p);
}

function renderShop(p) {
  const list = document.getElementById("shopList");
  const smithApplyBox = document.getElementById("smithApplyBox");
  const arsenalSubTabs = document.getElementById("arsenalSubTabs");
  renderShopTabs();

  if (selectedShopId === "arsenal") {
    arsenalSubTabs.innerHTML = ["weapon", "armor", "shield"].map((t) => `
      <button class="smallBtn ${selectedArsenalType === t ? "smallBtnPrimary" : ""}" onclick="selectArsenalType('${t}')">${t === "weapon" ? "Armas" : t === "armor" ? "Armaduras" : "Escudos"}</button>
    `).join("");
  } else {
    arsenalSubTabs.innerHTML = "";
  }

  const shop = SHOP_DB[selectedShopId] || { items: [] };
  let rows = shop.items || [];
  if (selectedShopId === "arsenal") rows = rows.filter((it) => it.type === selectedArsenalType);

  list.innerHTML = rows
    .map((it) => {
      const price = it.priceGold ?? 0;
      const affordable = (p.gold ?? 0) >= price;
      const actionLabel = selectedShopId === "ferreiro" ? "Aplicar" : "Comprar";
      const actionOnclick = selectedShopId === "ferreiro" ? `startApplyUpgrade('${it.id}')` : `buyItem('${it.id}')`;
      return `
      <div class="shopItem">
        <div class="invIcon">${iconForShopItem(it)}</div>
        <div style="flex:1;">
          <div class="invName">${it.name} ${price === 0 ? `<span class="badge">grátis</span>` : ""}</div>
          <div class="invDesc">${it.description || "Sem descrição."}</div>
        </div>
        <div class="price">
          <span>🪙 <strong>${price}</strong></span>
          <button class="smallBtn ${affordable ? "smallBtnPrimary" : ""}" onclick="${actionOnclick}" ${affordable ? "" : "disabled"}>${actionLabel}</button>
        </div>
      </div>
    `;
    })
    .join("");

  if (selectedShopId === "ferreiro") {
    renderSmithApplyBox(p);
    smithApplyBox.style.display = "block";
  } else {
    smithApplyBox.style.display = "none";
    smithApplyBox.innerHTML = "";
  }
}

function createInventoryItemFromShopEntry(entry) {
  const id = makeRuntimeItemId(entry.id);
  const runtimeItem = {
    id,
    baseId: entry.id,
    name: entry.name,
    icon: iconForShopItem(entry),
    type: entry.type,
    desc: entry.description || "",
    upgrades: [],
  };

  if (entry.type === "weapon") {
    runtimeItem.equipSlot = "weapon";
    runtimeItem.mods = { attack: 0 };
    runtimeItem.stats = {
      damage: entry.damage || null,
      crit: entry.crit || null,
      range: entry.range || null,
      damageType: entry.damageType || null,
      proficiency: entry.proficiency || null,
    };
  }
  if (entry.type === "armor") {
    runtimeItem.equipSlot = "armor";
    runtimeItem.mods = { defense: entry.defenseBonus || 0 };
    runtimeItem.stats = {
      defenseBonus: entry.defenseBonus || 0,
      penalty: entry.penalty || 0,
      category: entry.category || "",
    };
  }
  if (entry.type === "shield") {
    runtimeItem.equipSlot = "shield";
    runtimeItem.mods = { defense: entry.defenseBonus || 0 };
    runtimeItem.stats = {
      defenseBonus: entry.defenseBonus || 0,
      penalty: entry.penalty || 0,
    };
  }

  ITEM_DB[id] = runtimeItem;
  return id;
}

function buyItem(itemId) {
  if (!invTargetName) return;
  let data = load();
  let p = data.rooms[room][invTargetName];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);

  const shop = SHOP_DB[selectedShopId] || { items: [] };
  const shopEntry = (shop.items || []).find((s) => s.id === itemId);
  if (!shopEntry) return;

  const price = shopEntry.priceGold ?? 0;
  const gold = p.gold ?? 0;
  if (gold < price) {
    alert("Ouro insuficiente.");
    return;
  }

  const runtimeItemId = createInventoryItemFromShopEntry(shopEntry);
  const res = addItemToPlayer(p, runtimeItemId);
  if (!res.ok) {
    alert(res.msg || "Não foi possível comprar.");
    return;
  }

  p.gold = gold - price;

  const it = ITEM_DB[runtimeItemId];
  if (it && it.equipSlot === "weapon" && !p.equipped.weapon) {
    p.equipped.weapon = runtimeItemId;
  }

  recalcFromSheet(p);
  save(data);

  pushAction(currentUser, `${invTargetName} comprou ${it.icon || "📦"} ${it.name} por 🪙${price}.`);
  updateArena();
}

function startApplyUpgrade(upgradeId) {
  pendingUpgradeId = upgradeId;
  const p = load().rooms[room][invTargetName];
  if (!p) return;
  renderSmithApplyBox(p);
}

function renderSmithApplyBox(p) {
  const box = document.getElementById("smithApplyBox");
  const ferreiro = SHOP_DB.ferreiro || { items: [] };
  const upgrade = (ferreiro.items || []).find((u) => u.id === pendingUpgradeId);
  if (!upgrade) {
    box.innerHTML = `<div class="invDesc">Escolha uma melhoria e clique em Aplicar.</div>`;
    return;
  }

  const compatible = (p.inventory || []).map((entry, idx) => ({ idx, item: resolveInventoryItem(entry) }))
    .filter(({ item }) => item && upgrade.appliesTo.includes(item.type));

  if (!compatible.length) {
    box.innerHTML = `<div class="invDesc">Nenhum item compatível para <strong>${upgrade.name}</strong>.</div>`;
    return;
  }

  box.innerHTML = `
    <div class="invName" style="margin-bottom:8px;">Aplicar ${upgrade.name}</div>
    ${compatible.map(({ idx, item }) => `
      <div class="shopItem">
        <div class="invIcon">${item.icon || "📦"}</div>
        <div style="flex:1;">
          <div class="invName">${item.name}</div>
          <div class="invDesc">${item.desc || item.description || ""}</div>
        </div>
        <button class="smallBtn smallBtnPrimary" onclick="confirmApplyUpgrade('${upgrade.id}', ${idx})">Confirmar</button>
      </div>
    `).join("")}
  `;
}

function confirmApplyUpgrade(upgradeId, inventoryIndex) {
  if (!invTargetName) return;
  let data = load();
  const p = data.rooms[room][invTargetName];
  if (!p) return;

  const ferreiro = SHOP_DB.ferreiro || { items: [] };
  const upgrade = (ferreiro.items || []).find((u) => u.id === upgradeId);
  if (!upgrade) return;

  const price = upgrade.priceGold ?? 0;
  if ((p.gold ?? 0) < price) {
    alert("Ouro insuficiente.");
    return;
  }

  const entry = (p.inventory || [])[inventoryIndex];
  const item = resolveInventoryItem(entry);
  if (!item || !upgrade.appliesTo.includes(item.type)) {
    alert("Item incompatível.");
    return;
  }

  if (!item.upgrades) item.upgrades = [];
  item.upgrades.push({
    id: upgrade.id,
    name: upgrade.name,
    effect: upgrade.effect || {},
    priceGold: price,
  });

  if (!item.mods) item.mods = {};
  const eff = upgrade.effect || {};
  if (eff.defenseBonus) item.mods.defense = (item.mods.defense || 0) + eff.defenseBonus;
  if (eff.damageBonus) item.mods.str = (item.mods.str || 0) + eff.damageBonus;
  if (eff.attackBonus) item.mods.dex = (item.mods.dex || 0) + eff.attackBonus;

  p.gold -= price;
  p.inventory[inventoryIndex] = item;

  recalcFromSheet(p);
  save(data);
  pendingUpgradeId = null;

  pushAction(currentUser, `${invTargetName} aplicou 🔨 ${upgrade.name} em ${item.name} por 🪙${price}.`);
  updateArena();
}

/* mini menu inv */
function openItemMenu(evt, idx) {
  evt.stopPropagation();
  removeMiniMenu();

  const p = load().rooms[room][invTargetName];
  if (!p) return;
  const it = resolveInventoryItem((p.inventory || [])[idx]);
  if (!it) return;
  const anchor = evt.currentTarget;
  const r = anchor.getBoundingClientRect();

  const menu = document.createElement("div");
  menu.className = "miniMenu";
  menu.id = "miniMenu";

  const canEquip = !!it.equipSlot;
  const canUse = !!it.consume;

  menu.innerHTML = `
    <div class="muted">${it.icon} ${it.name}</div>
    ${canEquip ? `<button onclick="menuEquip(${idx})">🧷 Equipar</button>` : `<div class="muted">Não equipável</div>`}
    ${canUse ? `<button onclick="menuUse(${idx})">🧪 Usar</button>` : `<div class="muted">Não consumível</div>`}
    <button onclick="menuSend(${idx})">📦 Enviar para jogador</button>
    <button onclick="menuDrop(${idx})">🗑️ Descartar</button>
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
function menuEquip(idx) {
  if (!invTargetName) return;
  let data = load();
  const p = data.rooms[room][invTargetName];
  if (!p) return;
  ensurePlayerSchema(p);

  const item = resolveInventoryItem((p.inventory || [])[idx]);
  if (!item) return;
  equipItem(p, item.id);
  recalcFromSheet(p);
  save(data);

  pushAction(currentUser, `${invTargetName} equipou ${item.icon || "📦"} ${item.name}.`);

  removeMiniMenu();
  updateArena();
}
function menuUse(idx) {
  if (!invTargetName) return;
  let data = load();
  const p = data.rooms[room][invTargetName];
  if (!p) return;
  ensurePlayerSchema(p);
  recalcFromSheet(p);

  const item = resolveInventoryItem((p.inventory || [])[idx]);
  if (!item) return;
  const ok = useConsumable(p, item.id);
  if (!ok.ok) return;

  save(data);
  pushAction(currentUser, `${invTargetName} usou ${item.icon || "📦"} ${item.name}.`);

  removeMiniMenu();
  updateArena();
}
function menuDrop(idx) {
  if (!invTargetName) return;
  if (!confirm("Descartar este item?")) return;

  let data = load();
  const p = data.rooms[room][invTargetName];
  if (!p) return;
  ensurePlayerSchema(p);

  const item = resolveInventoryItem((p.inventory || [])[idx]);
  if (!item) return;
  if (item.equipSlot && p.equipped && p.equipped[item.equipSlot] === item.id) {
    p.equipped[item.equipSlot] = null;
  }
  (p.inventory || []).splice(idx, 1);
  recalcFromSheet(p);
  save(data);

  removeMiniMenu();
  updateArena();
}
function menuSend(idx) {
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

  const item = resolveInventoryItem((from.inventory || [])[idx]);
  if (!item) return;
  if (invCount(to) >= invMax(to)) {
    alert("Inventário do destino está cheio.");
    return;
  }

  if (
    item.equipSlot &&
    from.equipped &&
    from.equipped[item.equipSlot] === item.id
  ) {
    from.equipped[item.equipSlot] = null;
  }

  (from.inventory || []).splice(idx, 1);
  to.inventory.push(item);

  recalcFromSheet(from);
  recalcFromSheet(to);
  save(data);

  pushAction(
    currentUser,
    `${invTargetName} entregou ${item.icon || "📦"} ${item.name} para ${targetName}.`,
  );

  removeMiniMenu();
  updateArena();
}

/* ================= MASTER MODE / SCENE UI ================= */
const TILE_TYPES = ["floor", "grass", "stone", "wall", "woodwall", "stonewall", "void"];
let isMaster = false;
let paintTool = "floor";
let brushSize = 1;
let isPainting = false;
let sceneSection = "report";

function toggleMasterMode() {
  isMaster = !isMaster;
  const btn = document.getElementById("masterToggle");
  const panel = document.getElementById("scenePanel");
  const bar = document.getElementById("masterSceneBar");
  const dockBtn = document.getElementById("sceneDockToggle");
  btn.classList.toggle("on", isMaster);
  btn.textContent = isMaster ? "🛠️ Mestre: ON" : "🛠️ Mestre: OFF";
  isSceneDockOpen = isMaster;
  panel.classList.toggle("on", isSceneDockOpen);
  if (bar) bar.classList.toggle("on", isMaster);
  if (dockBtn) dockBtn.textContent = isSceneDockOpen ? "🎬 Mestre 1: ON" : "🎬 Mestre 1: OFF";

  if (isMaster) {
    setSceneSection(sceneSection);
    syncSceneUIFromStorage();
    attachPaintHandlers();
  } else {
    detachPaintHandlers();
    clearPaintHighlights();
  }
}

function toggleSceneDock() {
  if (!isMaster) {
    alert("Ative o modo Mestre para abrir o painel de cena.");
    return;
  }
  isSceneDockOpen = !isSceneDockOpen;
  const panel = document.getElementById("scenePanel");
  const dockBtn = document.getElementById("sceneDockToggle");
  if (panel) panel.classList.toggle("on", isSceneDockOpen);
  if (dockBtn) dockBtn.textContent = isSceneDockOpen ? "🎬 Mestre 1: ON" : "🎬 Mestre 1: OFF";
}

function setSceneSection(section) {
  sceneSection = section;
  document.querySelectorAll(".sceneSection").forEach((el) => {
    el.classList.toggle("active", el.dataset.sceneSection === section);
  });
  document.querySelectorAll(".sceneIconBtn").forEach((btn) => {
    btn.classList.toggle("active", btn.id === `sceneNav${section.charAt(0).toUpperCase()}${section.slice(1)}`);
  });
}
window.setSceneSection = setSceneSection;

function setTool(tool) {
  paintTool = TILE_TYPES.includes(tool) ? tool : "floor";
  TILE_TYPES.forEach((type) => {
    const btn = document.getElementById(`tool${type.charAt(0).toUpperCase()}${type.slice(1)}`);
    if (btn) btn.classList.toggle("active", type === paintTool);
  });
}

function setBrushSize(size) {
  brushSize = Math.max(1, Math.min(3, parseInt(size, 10) || 1));
  [1, 2, 3].forEach((n) => {
    const btn = document.getElementById(`brushSize${n}`);
    if (btn) btn.classList.toggle("active", n === brushSize);
  });
}
window.setBrushSize = setBrushSize;

function syncSceneUIFromStorage() {
  ensureScene();
  const s = load().scenes[room];
  document.getElementById("bgScale").value = s.bgScale;
  document.getElementById("bgOpacity").value = s.bgOpacity;
  document.getElementById("bgX").value = s.bgX;
  document.getElementById("bgY").value = s.bgY;
  document.getElementById("gridStyle").value = s.gridStyle || "square";
  document.getElementById("gridOpacity").value = s.gridOpacity ?? 55;
  document.getElementById("gridLine").value = s.gridLine ?? 1;
  const kindInput = document.getElementById("sceneLayerKind");
  if (kindInput && !kindInput.value) kindInput.value = "map";
  if (mapZoomInput) mapZoomInput.value = String(Math.round((s.mapZoom || 1) * 100));
  renderArtboardControls();
  renderSceneLayerList();
  setTool(paintTool);
  setBrushSize(brushSize);
  applySceneCSS();
}

function updateSceneLayer(layerId, updates = {}) {
  let data = load();
  const scene = data.scenes[room];
  const layer = getSceneLayerList(scene).find((entry) => entry.id === layerId);
  if (!layer) return;
  Object.assign(layer, updates);
  clampSceneLayerToGrid(layer, scene);
  save(data);
  updateArena();
  renderSceneLayerList();
}

function removeSceneLayer(layerId) {
  let data = load();
  const scene = data.scenes[room];
  scene.layers = getSceneLayerList(scene).filter((entry) => entry.id !== layerId);
  normalizeSceneLayers(scene);
  save(data);
  updateArena();
  renderSceneLayerList();
}

function shiftSceneLayer(layerId, direction) {
  let data = load();
  const scene = data.scenes[room];
  const layers = getSceneLayerList(scene);
  const idx = layers.findIndex((entry) => entry.id === layerId);
  if (idx < 0) return;
  const target = idx + direction;
  if (target < 0 || target >= layers.length) return;
  const tmp = layers[idx];
  layers[idx] = layers[target];
  layers[target] = tmp;
  sortSceneLayers(layers);
  save(data);
  updateArena();
  renderSceneLayerList();
}

function renderSceneLayerList() {
  const wrap = document.getElementById("sceneLayerList");
  if (!wrap) return;
  ensureScene();
  const layers = getSceneLayerList(load().scenes[room]);
  if (!layers.length) {
    wrap.innerHTML = '<div class="sceneHint">Sem camadas extras. Importe uma imagem para montar o mapa.</div>';
    return;
  }

  wrap.innerHTML = layers
    .map((layer, idx) => {
      const safeName = escapeHtml(layer.name || `Camada ${idx + 1}`);
      return `
        <div class="sceneLayerCard" data-layer-id="${layer.id}">
          <div class="sceneLayerTop">
            <strong>${safeName}</strong>
            <span>${SCENE_LAYER_KIND_LABELS[layer.kind] || layer.kind}</span>
          </div>
          <div class="sceneLayerControls">
            <label>X <input type="number" class="layerNum" data-field="x" value="${layer.x}" /></label>
            <label>Y <input type="number" class="layerNum" data-field="y" value="${layer.y}" /></label>
            <label>Larg <input type="number" class="layerNum" data-field="width" min="1" value="${layer.width}" /></label>
            <label>Alt <input type="number" class="layerNum" data-field="height" min="1" value="${layer.height}" /></label>
            <label>Opac <input type="range" class="layerRange" data-field="opacity" min="0" max="100" value="${layer.opacity}" /></label>
            <label><input type="checkbox" class="layerChk" data-field="visible" ${layer.visible ? "checked" : ""}/> Visível</label>
            <label><input type="checkbox" class="layerChk" data-field="lockToGrid" ${layer.lockToGrid ? "checked" : ""}/> Grid</label>
            <label>Tipo
              <select class="layerKind" data-field="kind">
                <option value="map" ${layer.kind === "map" ? "selected" : ""}>Mapa</option>
                <option value="objects" ${layer.kind === "objects" ? "selected" : ""}>Objetos</option>
                <option value="foreground" ${layer.kind === "foreground" ? "selected" : ""}>Superior</option>
              </select>
            </label>
          </div>
          <div class="sceneLayerActions">
            <button type="button" class="toolBtn" data-act="up">▲</button>
            <button type="button" class="toolBtn" data-act="down">▼</button>
            <button type="button" class="toolBtn" data-act="remove">Remover</button>
          </div>
        </div>`;
    })
    .join("");

  wrap.querySelectorAll('.sceneLayerCard').forEach((card) => {
    const layerId = card.dataset.layerId;
    card.querySelectorAll('.layerNum, .layerRange').forEach((input) => {
      input.addEventListener('input', () => {
        const field = input.dataset.field;
        updateSceneLayer(layerId, { [field]: parseInt(input.value, 10) || 0 });
      });
    });
    card.querySelectorAll('.layerChk').forEach((input) => {
      input.addEventListener('change', () => {
        const field = input.dataset.field;
        updateSceneLayer(layerId, { [field]: !!input.checked });
      });
    });
    const kindSel = card.querySelector('.layerKind');
    if (kindSel) {
      kindSel.addEventListener('change', () => {
        updateSceneLayer(layerId, { kind: kindSel.value });
      });
    }
    const upBtn = card.querySelector('[data-act="up"]');
    const downBtn = card.querySelector('[data-act="down"]');
    const removeBtn = card.querySelector('[data-act="remove"]');
    if (upBtn) upBtn.addEventListener('click', () => shiftSceneLayer(layerId, -1));
    if (downBtn) downBtn.addEventListener('click', () => shiftSceneLayer(layerId, 1));
    if (removeBtn) removeBtn.addEventListener('click', () => removeSceneLayer(layerId));
  });
}


function renderArtboardControls() {
  const select = artboardSelect;
  const colsInput = document.getElementById("sceneCols");
  const rowsInput = document.getElementById("sceneRows");
  if (!select || !colsInput || !rowsInput) return;
  ensureScene();
  const scene = load().scenes[room];
  ensureSceneArtboards(scene);
  const boards = scene.artboards || [];
  select.innerHTML = boards.map((board, idx) => `<option value="${board.id}">${escapeHtml(board.name || `Cenário ${idx + 1}`)}</option>`).join("");
  select.value = scene.activeArtboardId || boards[0]?.id || "";
  colsInput.value = String(scene.cols || DEFAULT_COLS);
  rowsInput.value = String(scene.rows || DEFAULT_ROWS);
}

window.createArtboard = function createArtboard() {
  let data = load();
  const scene = data.scenes[room];
  ensureSceneArtboards(scene);
  syncSceneToActiveArtboard(scene);
  const next = extractArtboardFromScene(scene, `Cenário ${scene.artboards.length + 1}`);
  next.id = `board_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  scene.artboards.push(next);
  scene.activeArtboardId = next.id;
  applyArtboardToScene(scene, next);
  save(data);
  createGrid();
  updateArena();
  syncSceneUIFromStorage();
};

window.renameArtboard = function renameArtboard() {
  let data = load();
  const scene = data.scenes[room];
  ensureSceneArtboards(scene);
  const active = scene.artboards.find((board) => board.id === scene.activeArtboardId);
  if (!active) return;
  const nextName = prompt("Nome do cenário:", active.name || "Cenário");
  if (!nextName) return;
  active.name = String(nextName).trim().slice(0, 40) || active.name;
  save(data);
  renderArtboardControls();
};

window.deleteArtboard = function deleteArtboard() {
  let data = load();
  const scene = data.scenes[room];
  ensureSceneArtboards(scene);
  if (scene.artboards.length <= 1) return alert("Você precisa manter ao menos 1 cenário.");
  const idx = scene.artboards.findIndex((board) => board.id === scene.activeArtboardId);
  if (idx < 0) return;
  scene.artboards.splice(idx, 1);
  const next = scene.artboards[Math.max(0, idx - 1)] || scene.artboards[0];
  scene.activeArtboardId = next.id;
  applyArtboardToScene(scene, next);
  save(data);
  createGrid();
  updateArena();
  syncSceneUIFromStorage();
};

window.applyArtboardSize = function applyArtboardSize() {
  const colsInput = document.getElementById("sceneCols");
  const rowsInput = document.getElementById("sceneRows");
  if (!colsInput || !rowsInput) return;
  const nextCols = Math.max(6, Math.min(80, parseInt(colsInput.value, 10) || DEFAULT_COLS));
  const nextRows = Math.max(6, Math.min(80, parseInt(rowsInput.value, 10) || DEFAULT_ROWS));
  let data = load();
  const scene = data.scenes[room];
  scene.cols = nextCols;
  scene.rows = nextRows;
  const needed = nextCols * nextRows;
  scene.tiles = Array.from({ length: needed }, (_, i) => scene.tiles?.[i] || "floor");
  save(data);
  createGrid();
  updateArena();
  syncSceneUIFromStorage();
};

function bindSceneInputs() {
  const bgScale = document.getElementById("bgScale");
  const bgOpacity = document.getElementById("bgOpacity");
  const bgX = document.getElementById("bgX");
  const bgY = document.getElementById("bgY");
  const gridStyle = document.getElementById("gridStyle");
  const gridOpacity = document.getElementById("gridOpacity");
  const gridLine = document.getElementById("gridLine");

  if (artboardSelect && !artboardSelect.dataset.bound) {
    artboardSelect.dataset.bound = "1";
    artboardSelect.addEventListener("change", () => {
      let data = load();
      const scene = data.scenes[room];
      ensureSceneArtboards(scene);
      syncSceneToActiveArtboard(scene);
      const next = scene.artboards.find((board) => board.id === artboardSelect.value);
      if (!next) return;
      scene.activeArtboardId = next.id;
      applyArtboardToScene(scene, next);
      save(data);
      createGrid();
      updateArena();
      syncSceneUIFromStorage();
    });
  }

  function upd() {
    let data = load();
    const s = data.scenes[room];
    s.bgScale = parseInt(bgScale.value, 10);
    s.bgOpacity = parseInt(bgOpacity.value, 10);
    s.bgX = parseInt(bgX.value, 10);
    s.bgY = parseInt(bgY.value, 10);
    s.gridStyle = ["square", "dots"].includes(gridStyle.value) ? gridStyle.value : "square";
    s.gridOpacity = parseInt(gridOpacity.value, 10);
    s.gridLine = parseInt(gridLine.value, 10);
    save(data);
    applySceneCSS();
  }
  bgScale.addEventListener("input", upd);
  bgOpacity.addEventListener("input", upd);
  bgX.addEventListener("input", upd);
  bgY.addEventListener("input", upd);
  gridStyle.addEventListener("change", upd);
  gridOpacity.addEventListener("input", upd);
  gridLine.addEventListener("input", upd);

}
bindSceneInputs();

function fillAll(type) {
  const fillType = TILE_TYPES.includes(type) ? type : "floor";
  let data = load();
  const s = data.scenes[room];
  s.tiles = new Array(s.cols * s.rows).fill(fillType);
  save(data);
  document.querySelectorAll(".cell").forEach((cell) => {
    clearTileClasses(cell);
    cell.classList.remove("paint-floor", "paint-wall", "paint-void");
    cell.classList.add("tile-" + fillType);
  });
  refreshTokenPlacements();
}


function refreshTokenPlacements() {
  const s = load().scenes[room];
  const cells = [...document.querySelectorAll(".cell")];
  const data = load();
  const players = data.rooms[room];
  Object.keys(players).forEach((name) => {
    const p = players[name];
    if (!p?.onTable) return;
    p.x = Math.max(0, Math.min(s.cols - 1, Math.round(Number(p.x) || 0)));
    p.y = Math.max(0, Math.min(s.rows - 1, Math.round(Number(p.y) || 0)));
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
    const stack = document.querySelector(`.tokenStack[data-player="${CSS.escape(name)}"]`);
    if (stack) cell.appendChild(stack);
  });
  save(data);
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
  let data = load();
  const s = data.scenes[room];
  let changed = false;

  for (let oy = 0; oy < brushSize; oy++) {
    for (let ox = 0; ox < brushSize; ox++) {
      const px = x + ox;
      const py = y + oy;
      if (px >= s.cols || py >= s.rows) continue;
      const idx = py * s.cols + px;
      if (s.tiles[idx] === t) continue;
      s.tiles[idx] = t;
      changed = true;

      const targetCell = document.querySelector(`.cell[data-x="${px}"][data-y="${py}"]`);
      if (!targetCell) continue;
      targetCell.classList.remove("paint-floor", "paint-wall", "paint-void");
      clearTileClasses(targetCell);
      targetCell.classList.add("tile-" + t);
      if (t === "floor" || t === "wall" || t === "void") {
        targetCell.classList.add("paint-" + t);
      }
    }
  }

  if (changed) save(data);
}

function clearPaintHighlights() {
  document.querySelectorAll(".cell").forEach((c) => {
    c.classList.remove("paint-floor", "paint-wall", "paint-void");
  });
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.onclick = () => {
    const auth = loadAuthState();
    auth.lastSessionEmail = "";
    saveAuthState(auth);
    window.location.reload();
  };
}

/* ================= INIT ================= */
createGrid();
applySceneCSS();
bindMapInteractions();
setMapZoom(getSceneZoom(), false);
updateArena();
setDiceTrayOpen(false);
initChatComposer();
updateChat();
loadShopCatalogs().then(() => {
  if (!invTargetName) return;
  const p = load().rooms[room][invTargetName];
  if (!p) return;
  renderShop(p);
});

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

function professionDebugLog(info) {
  console.debug("[Profissões Debug]", info);
}

function getProfessionLevelFromXp(xp) {
  return Math.max(1, Math.floor((xp || 0) / PROFESSION_XP_PER_LEVEL) + 1);
}

function getShopEntryById(itemId) {
  for (const shop of Object.values(SHOP_DB)) {
    const found = (shop.items || []).find((it) => it.id === itemId);
    if (found) return found;
  }
  return null;
}

function addReagentToPlayer(p, reagentId, qty) {
  if (!REAGENT_BY_ID[reagentId]) return;
  p.reagents_inventory[reagentId] = (p.reagents_inventory[reagentId] || 0) + qty;
}

function consumeReagentsFromPlayer(p, reagents) {
  for (const req of reagents) {
    if ((p.reagents_inventory[req.id] || 0) < req.qtd) return false;
  }
  for (const req of reagents) {
    p.reagents_inventory[req.id] -= req.qtd;
    if (p.reagents_inventory[req.id] <= 0) delete p.reagents_inventory[req.id];
  }
  return true;
}

function gainProfessionXp(p, professionId, xpGain) {
  const prog = p.professions_progress[professionId] || { xp: 0, level: 1 };
  prog.xp += xpGain;
  prog.level = getProfessionLevelFromXp(prog.xp);
  p.professions_progress[professionId] = prog;
}

function collectProfession(professionId) {
  if (!professionTargetName) return;
  const data = load();
  const p = data.rooms[room][professionTargetName];
  if (!p) return;
  ensurePlayerSchema(p);
  if ((p.downtime_days || 0) < 1) {
    alert("Sem downtime suficiente.");
    return;
  }
  const table = {
    culinaria: [{ id: "carne_selvagem", qtd: 2 }, { id: "grao_fino", qtd: 1 }],
    alquimia: [{ id: "erva_comum", qtd: 2 }, { id: "erva_rara", qtd: 1 }],
    ferraria: [{ id: "minerio_ferro", qtd: 2 }, { id: "minerio_aco", qtd: 1 }],
  };
  const gains = table[professionId] || [];
  gains.forEach((g) => addReagentToPlayer(p, g.id, g.qtd));
  p.downtime_days -= 1;
  gainProfessionXp(p, professionId, 20);
  professionDebugLog({ reagentes_ganhos: gains, xp_ganho: 20, downtime_gasto: 1, craft_output: null, saldo_ouro: p.gold });
  save(data);
  renderProfessionsModal(p);
  updateArena();
}

function craftRecipe(recipeId) {
  if (!professionTargetName) return;
  const data = load();
  const p = data.rooms[room][professionTargetName];
  if (!p) return;
  ensurePlayerSchema(p);
  const recipe = PROFESSIONS_DB.recipes.find((r) => r.id === recipeId);
  if (!recipe) return;
  const prog = p.professions_progress[recipe.profissao_id] || { level: 1, xp: 0 };
  if (prog.level < recipe.nivel_profissao_min) return alert("Nível de profissão insuficiente.");
  if ((p.downtime_days || 0) < (recipe.tempo_dias || 1)) return alert("Downtime insuficiente.");
  const shopEntry = getShopEntryById(recipe.output.item_id);
  if (!shopEntry) return alert("Item de saída não existe no banco de itens.");
  if (!consumeReagentsFromPlayer(p, recipe.reagentes || [])) return alert("Reagentes insuficientes.");
  p.downtime_days -= (recipe.tempo_dias || 1);
  for (let i = 0; i < (recipe.output.qtd || 1); i += 1) {
    const itemRuntimeId = createInventoryItemFromShopEntry(shopEntry);
    const res = addItemToPlayer(p, itemRuntimeId);
    if (!res.ok) break;
  }
  gainProfessionXp(p, recipe.profissao_id, recipe.xp_gain || 0);
  professionDebugLog({ reagentes_ganhos: [], xp_ganho: recipe.xp_gain || 0, downtime_gasto: recipe.tempo_dias || 1, craft_output: recipe.output.item_id, saldo_ouro: p.gold });
  save(data);
  renderProfessionsModal(p);
  updateArena();
}

function sellFirstReagent() {
  if (!professionTargetName) return;
  const data = load();
  const p = data.rooms[room][professionTargetName];
  if (!p) return;
  ensurePlayerSchema(p);
  const first = Object.entries(p.reagents_inventory).find(([, q]) => q > 0);
  if (!first) return alert("Sem reagentes para vender.");
  const [rid] = first;
  const reagent = REAGENT_BY_ID[rid];
  p.reagents_inventory[rid] -= 1;
  if (p.reagents_inventory[rid] <= 0) delete p.reagents_inventory[rid];
  p.gold += reagent?.valor_venda_gp || 0;
  professionDebugLog({ reagentes_ganhos: [], xp_ganho: 0, downtime_gasto: 0, craft_output: null, saldo_ouro: p.gold });
  save(data);
  renderProfessionsModal(p);
  updateArena();
}

function openProfessions() {
  professionTargetName = currentUser;
  const p = load().rooms?.[room]?.[professionTargetName];
  if (!p) return;
  ensurePlayerSchema(p);
  document.getElementById("professionsSub").textContent = `Personagem: ${professionTargetName}`;
  document.getElementById("professionsOverlay").style.display = "flex";
  renderProfessionsModal(p);
}

function closeProfessions() {
  document.getElementById("professionsOverlay").style.display = "none";
  professionTargetName = null;
}

function renderProfessionsModal(p) {
  const panel = document.getElementById("professionsPanel");
  if (!panel) return;
  const profTabs = PROFESSIONS_DB.professions.map((prof) => `<button class="smallBtn ${selectedProfessionId === prof.id ? "smallBtnPrimary" : ""}" onclick="selectedProfessionId='${prof.id}'; renderProfessionsModal(load().rooms[room][professionTargetName]);">${prof.nome}</button>`).join("");
  const recipes = PROFESSIONS_DB.recipes.filter((r) => r.profissao_id === selectedProfessionId);
  const reagentsHtml = Object.entries(p.reagents_inventory || {}).map(([rid, qty]) => `<div class="reagentRow"><span>${REAGENT_BY_ID[rid]?.nome || rid}</span><strong>x${qty}</strong></div>`).join("") || '<div class="invDesc">Sem reagentes.</div>';
  const productionOptions = ["culinaria", "alquimia", "ferraria"].map((id) => `<label><input type="checkbox" ${p.production_professions.includes(id) ? "checked" : ""} onchange="toggleProductionProfession('${id}', this.checked)"> ${PROFESSION_BY_ID[id].nome}</label>`).join(" ");
  panel.innerHTML = `
    <div class="profSection"><strong>Downtime:</strong> ${p.downtime_days}</div>
    <div class="profSection">${profTabs}</div>
    <div class="profSection">
      <div><strong>Profissões de produção (máx ${MAX_PRODUCTION_PROFESSIONS})</strong></div>
      <div>${productionOptions}</div>
    </div>
    ${PROFESSIONS_DB.professions.map((prof) => `<div class="profSection"><div class="profHeader"><strong>${prof.nome}</strong><span class="profBadge">Nv ${p.professions_progress[prof.id]?.level || 1} • XP ${p.professions_progress[prof.id]?.xp || 0}</span></div></div>`).join("")}
    <div class="profSection"><strong>Ações</strong><div class="profActions"><button class="smallBtn smallBtnPrimary" onclick="collectProfession('${selectedProfessionId}')">Coletar</button><button class="smallBtn smallBtnPrimary" onclick="sellFirstReagent()">Vender</button></div></div>
    <div class="profSection"><strong>Receitas (${PROFESSION_BY_ID[selectedProfessionId]?.nome || ''})</strong>${recipes.map((r) => `<div class="reagentRow"><span>${r.nome} → ${r.output.item_id}</span><button class="smallBtn" onclick="craftRecipe('${r.id}')">Craftar</button></div>`).join('') || '<div class="invDesc">Sem receitas.</div>'}</div>
    <div class="profSection"><strong>Inventário de reagentes</strong>${reagentsHtml}</div>
    <div class="profSection"><strong>Mercador / Loja do jogador</strong><button class="smallBtn" onclick="togglePlayerShopEnabled()">${p.player_shop.enabled ? "Desativar" : "Ativar"} loja</button><button class="smallBtn" onclick="openPlayerShop('${professionTargetName}','${currentUser}')">Abrir Loja</button></div>
  `;
}

function toggleProductionProfession(id, checked) {
  if (!professionTargetName) return;
  const data = load();
  const p = data.rooms[room][professionTargetName];
  if (!p) return;
  ensurePlayerSchema(p);
  const set = new Set(p.production_professions || []);
  if (checked) {
    if (set.size >= MAX_PRODUCTION_PROFESSIONS && !set.has(id)) return alert("Limite de 2 profissões de produção.");
    set.add(id);
  } else {
    set.delete(id);
  }
  p.production_professions = Array.from(set).slice(0, MAX_PRODUCTION_PROFESSIONS);
  save(data);
  renderProfessionsModal(p);
}

function togglePlayerShopEnabled() {
  if (!professionTargetName) return;
  const data = load();
  const p = data.rooms[room][professionTargetName];
  if (!p) return;
  ensurePlayerSchema(p);
  p.player_shop.enabled = !p.player_shop.enabled;
  save(data);
  renderProfessionsModal(p);
  updateArena();
}

function openPlayerShop(sellerName, buyerName) {
  const data = load();
  const seller = data.rooms?.[room]?.[sellerName];
  const buyer = data.rooms?.[room]?.[buyerName];
  if (!seller || !seller.player_shop?.enabled) return alert("Loja indisponível.");
  ensurePlayerSchema(seller);
  if (buyer) ensurePlayerSchema(buyer);
  document.getElementById("playerShopTitle").textContent = `${seller.player_shop.icon || "🏪"} ${seller.player_shop.name || "Loja"}`;
  document.getElementById("playerShopOverlay").style.display = "flex";
  renderPlayerShopPanel(sellerName, buyerName || currentUser);
}

function closePlayerShop() {
  document.getElementById("playerShopOverlay").style.display = "none";
}

function addItemToPlayerShopFromInventory(invIdx) {
  const data = load();
  const seller = data.rooms?.[room]?.[currentUser];
  if (!seller) return;
  ensurePlayerSchema(seller);
  const item = resolveInventoryItem((seller.inventory || [])[invIdx]);
  if (!item) return;
  const exists = getShopEntryById(item.baseId || item.id);
  if (!exists) return alert("Item inválido para vitrine (item_id inexistente no banco).");
  const baseId = item.baseId || exists.id;
  const price = exists.sell_price_gp ?? Math.floor((exists.priceGold ?? 0) * 0.5);
  seller.player_shop.inventory.push({ item_id: baseId, qty: 1, price_gp: Math.max(1, price || 1) });
  seller.inventory.splice(invIdx, 1);
  save(data);
  renderPlayerShopPanel(currentUser, currentUser);
  updateArena();
}

function renderPlayerShopPanel(sellerName, buyerName) {
  const data = load();
  const seller = data.rooms?.[room]?.[sellerName];
  const buyer = data.rooms?.[room]?.[buyerName];
  if (!seller) return;
  const panel = document.getElementById("playerShopPanel");
  const invRows = (seller.player_shop.inventory || []).map((entry, idx) => {
    const db = getShopEntryById(entry.item_id);
    if (!db) return '';
    return `<div class="shopPlayerRow"><span>${db.name} (x${entry.qty})</span><strong>🪙${entry.price_gp}</strong>${buyerName !== sellerName ? `<button class="smallBtn" onclick="buyFromPlayerShop('${sellerName}','${buyerName}',${idx})">Comprar</button>` : ''}</div>`;
  }).join('') || '<div class="invDesc">Sem itens na loja.</div>';
  const ownInv = sellerName === currentUser ? (seller.inventory || []).map((entry, idx) => { const it=resolveInventoryItem(entry); return it ? `<div class=\"shopPlayerRow\"><span>${it.name}</span><button class=\"smallBtn\" onclick=\"addItemToPlayerShopFromInventory(${idx})\">Adicionar à vitrine</button><button class=\"smallBtn\" onclick=\"sellInventoryItemToMarket(${idx})\">Vender para Mercado</button></div>` : ''; }).join('') : '';
  panel.innerHTML = `<div class="profSection"><strong>Vendedor:</strong> ${sellerName} • <strong>Comprador:</strong> ${buyerName}</div><div class="profSection"><strong>Itens à venda</strong>${invRows}</div>${ownInv ? `<div class=\"profSection\"><strong>Seu inventário</strong>${ownInv}</div>` : ''}`;
}

function buyFromPlayerShop(sellerName, buyerName, shopIdx) {
  const data = load();
  const seller = data.rooms?.[room]?.[sellerName];
  const buyer = data.rooms?.[room]?.[buyerName];
  if (!seller || !buyer) return;
  ensurePlayerSchema(seller); ensurePlayerSchema(buyer);
  const entry = seller.player_shop.inventory[shopIdx];
  if (!entry || entry.qty <= 0) return;
  if ((buyer.gold || 0) < entry.price_gp) return alert("Gold insuficiente.");
  const db = getShopEntryById(entry.item_id);
  if (!db) return alert("Item inválido na loja.");
  const runtimeId = createInventoryItemFromShopEntry(db);
  const added = addItemToPlayer(buyer, runtimeId);
  if (!added.ok) return alert(added.msg || "Falha ao comprar.");
  buyer.gold -= entry.price_gp;
  seller.gold += entry.price_gp;
  entry.qty -= 1;
  if (entry.qty <= 0) seller.player_shop.inventory.splice(shopIdx, 1);
  pushAction(currentUser, `[Loja] ${buyerName} comprou ${db.name} de ${sellerName} por 🪙${entry.price_gp}.`);
  save(data);
  renderPlayerShopPanel(sellerName, buyerName);
  updateArena();
}

function sellInventoryItemToMarket(invIdx) {
  const data = load();
  const p = data.rooms?.[room]?.[currentUser];
  if (!p) return;
  ensurePlayerSchema(p);
  const item = resolveInventoryItem((p.inventory || [])[invIdx]);
  if (!item) return;
  const db = getShopEntryById(item.baseId || item.id);
  const sell = db?.sell_price_gp ?? Math.floor((db?.priceGold ?? 0) * 0.5);
  p.gold += Math.max(0, sell || 0);
  p.inventory.splice(invIdx, 1);
  save(data);
  renderPlayerShopPanel(currentUser, currentUser);
  updateArena();
}
