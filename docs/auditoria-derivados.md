# Auditoria completa — estatísticas derivadas da ficha

## Escopo
Diagnóstico completo dos campos derivados da ficha, comparando implementação atual com regras do banco JSON (SRD seedado), sem alterar código-fonte de regras.

---

## 1) Campos derivados identificados

### Implementados atualmente
- `hp_total` (persistido como `p.hpMax`)
- `magic_points_total` (persistido como `p.manaMax`)
- `ac_total` (persistido como `p.defense`)
- `proficiency_bonus` (persistido como `p.proficiencyBonus`)
- `skill_modifiers` (calculado na UI em tempo de render, não persistido por campo)

### Não implementados como derivado dedicado
- `initiative`
- `saving_throws` (todas)
- `attack_bonus` (ataque básico)
- `spell_attack_bonus`
- `spell_save_dc`
- `speed_total`
- `passive_perception`

---

## 2) Fórmulas atuais por campo derivado

### 2.1 hp_total (`p.hpMax`)

**Fórmula textual**
1. Se a classe está em `full_roll` com `roll` no nível 1 e por nível:
   - `HP = soma(hpRolls) + (nível * CON_mod)` (ou `+CON_mod` se flag de classe desativar por nível)
2. Caso contrário, fallback interno:
   - `HP = 10 + (CON_mod + 2) * 3 + (nível - 1) * 2`
3. Extras:
   - Se raça for tratada como Anão da Colina legado: `+2 * nível`
   - Soma bônus de item (`hpMax`)
   - Clamp mínimo em 1

**Pseudocódigo**
```text
if full_roll && level1_rule=roll && per_level_rule=roll:
  ensureHpRollsForCharacter()
  hp = sum(hpRolls) + (adds_con_mod_each_level ? conMod * level : conMod)
else:
  hp = 10 + (conMod + 2) * 3 + (level - 1) * 2

if race = hill dwarf (legacy rule): hp += level * 2
hp += itemMods.hpMax
hp = max(1, hp)
```

**Entradas usadas**
- Classe: `hitDie`, `hpMode`
- Personagem: `level`, `owner`, `class`, `race`, `name` (seed da rolagem), `hpRolls`
- Atributos derivados: `CON_mod`
- Itens equipados: `itemMods.hpMax`
- Regra racial especial hardcoded de Anão da Colina legado

**Intermediários usados na execução**
- `hitDieSize`, flags de `hpMode`, `hpRolls`, `totalRoll`, `conTotal`

---

### 2.2 magic_points_total (`p.manaMax`)

**Fórmula textual**
- Se `magicPoints.enabled = false`: 0
- Se `nível < starts_at_level`: 0
- Se houver tabela: `floor(universal_base[nível] * multiplier)`
- Soma bônus de item (`manaMax`)
- Clamp mínimo em 0

**Pseudocódigo**
```text
if !cfg.enabled: return 0
if level < starts_at_level: return 0
if !magicPointTable: return 0
mana = floor(magicPointTable[level] * multiplier)
mana += itemMods.manaMax
mana = max(0, mana)
```

**Entradas usadas**
- Classe: `magicPoints`, `magicPointTable`
- Personagem: `level`
- Itens equipados: `itemMods.manaMax`

**Intermediários**
- `startsAtLevel`, `base`, `multiplier`

---

### 2.3 ac_total (`p.defense`)

**Fórmula textual**
- `CA = 10 + DEX_mod + bônus_de_item_defense`

**Pseudocódigo**
```text
ac = 10 + dexMod + itemMods.defense
```

**Entradas usadas**
- `DEX_mod`
- `itemMods.defense`

**Intermediários**
- Nenhum branch por tipo de armadura

---

### 2.4 proficiency_bonus (`p.proficiencyBonus`)

**Fórmula textual**
- `Prof = 2 + floor((nível - 1)/4)`

**Pseudocódigo**
```text
prof = 2 + floor((level - 1) / 4)
```

**Entradas**
- `level`

---

### 2.5 skill_modifiers (UI)

**Fórmula textual**
Para cada perícia:
- `mod_pericia = mod_atributo + prof*2` (se expertise)
- `mod_pericia = mod_atributo + prof` (se treinada)
- `mod_pericia = mod_atributo` (se não treinada)

**Pseudocódigo**
```text
if expert: bonus = attrMod + 2*prof
else if trained: bonus = attrMod + prof
else: bonus = attrMod
```

**Entradas usadas**
- `attributeMods`
- `proficiencyBonus`
- flags de proficiência/expertise por perícia

---

### 2.6 Derivados não implementados

Os campos abaixo não possuem cálculo dedicado/persistido:
- `initiative`
- `saving_throws`
- `attack_bonus`
- `spell_attack_bonus`
- `spell_save_dc`
- `speed_total`
- `passive_perception`

---

## 3) Checagem contra regras do banco/schema

### HP
- **Status:** alinhado para classes `full_roll` com `roll` nível 1/per nível.
- Observação: há fallback interno para cenários fora de `full_roll`.

### PM
- **Status:** alinhado ao padrão esperado (`starts_at_level`, `universal_base`, `multiplier`, `floor`).

### CA
- **Status:** **divergente** da regra esperada.
- Falta ramificação:
  - armadura equipada com limite de DEX
  - defesa sem armadura (Bárbaro: DEX+CON; Monge: DEX+SAB)

### speed_total
- **Status:** divergente/ausente.
- O SRD possui `speed_m`, mas a normalização atual da raça não mapeia velocidade para runtime.

### sub-raça (impacto em derivados)
- O banco modela `Elfo` e `Elfo da Floresta` separadamente.
- O app aplica somente os bônus da raça selecionada, sem composição explícita raça-base + sub-raça.

---

## 4) Relatórios dos 2 personagens de teste (lado a lado)

> Premissas para viabilizar cálculo reproduzível: sem itens equipados, sem bônus temporários, background `Nenhum`, atributos base por point-buy padrão.

### A) Meio-Orc Bárbaro nível 1 (CON_mod=+3)
- Scores base adotados: STR 15, DEX 14, CON 14, INT 8, WIS 10, CHA 8
- Bônus raciais aplicados no modelo atual: STR +2, CON +1 (em `mods`, não no score)
- `mods` finais: STR +4, DEX +2, CON +3, INT -1, WIS 0, CHA -1
- `prof`: +2

**HP**
- `hitDie`: d12
- `hpRolls`: [4]
- `conTotal`: +3
- **Resultado:** `hp_total = 7`

**PM**
- Bárbaro com `magicPoints.enabled=false`
- **Resultado:** `magic_points_total = 0`

**CA**
- `10 + DEX_mod(+2) + itemDefense(0)`
- **Resultado:** `ac_total = 12`

**Initiative**
- Não implementada como campo derivado persistido

**Saving Throws**
- Não implementados no app (estimável por regra padrão)

**Skills**
- Cálculo disponível apenas na UI

**Attack bonus / Spell attack / Spell DC / Speed / Passive Perception**
- Não implementados como derivados dedicados

---

### B) Elfo da Floresta Ladino nível 19
- Scores base adotados: STR 8, DEX 15, CON 14, INT 12, WIS 10, CHA 10
- Bônus raciais (modelo atual para raça selecionada): WIS +1
- `mods` finais: STR -1, DEX +2, CON +2, INT +1, WIS +1, CHA 0
- `prof`: +6

**HP**
- `hitDie`: d8
- `hpRolls`: [2,2,1,8,1,5,2,8,4,8,1,4,3,1,6,1,2,1,6]
- `sum(rolls)=66`
- `conTotal=19*2=38`
- **Resultado:** `hp_total = 104`

**PM**
- Ladino com `magicPoints.enabled=false` no banco atual
- **Resultado:** `magic_points_total = 0`

**CA**
- `10 + DEX_mod(+2) + itemDefense(0)`
- **Resultado:** `ac_total = 12`

**Initiative / Saving Throws / Attack bonus / Spell attack / Spell DC / Speed / Passive Perception**
- Não implementados como derivados dedicados

---

## 5) Divergências encontradas (sem corrigir)

1. **CA simplificada, sem regra de armadura e sem defesa sem armadura de classe**
   - Arquivo: `app.js`
   - Função: `recalcFromSheet`
   - Linha aproximada: onde define `p.defense = 10 + mods.dex + ...`
   - Erro: não segue a matriz de CA por armadura/unarmored
   - Como deveria ser: aplicar regra condicional por armadura equipada, limite de DEX e feature de classe (Bárbaro/Monge)

2. **Derivados obrigatórios ausentes**
   - Arquivo: `app.js`
   - Função: pipeline de `recalcFromSheet`
   - Linha aproximada: bloco de recálculo principal
   - Erro: não calcula/persiste `initiative`, `saving_throws`, `attack_bonus`, `spell_attack_bonus`, `spell_save_dc`, `speed_total`, `passive_perception`
   - Como deveria ser: derivar todos em um único pipeline de cálculo auditável

3. **Velocidade de raça não entra no runtime**
   - Arquivos: `data/rpg_srd_base.json` e `app.js`
   - Função: `normalizeRaceDatabase`
   - Erro: `speed_m` existe no SRD, mas não é mapeado no objeto de raça usado pela ficha
   - Como deveria ser: carregar velocidade na normalização e derivar `speed_total`

4. **Modelagem de sub-raça sem composição explícita com raça-base**
   - Arquivos: `data/rpg_srd_base.json`, `data/generated/races.db.json`, `app.js`
   - Funções: seed + normalização + recálculo
   - Erro: bônus de sub-raça não necessariamente agregam bônus da raça-base
   - Como deveria ser: composição controlada (base + sub-raça) ou seed já “flattened” de forma consistente

5. **Bônus raciais aplicados diretamente no modificador**
   - Arquivo: `app.js`
   - Função: `recalcFromSheet`
   - Erro: soma `modDelta` em `mods[...]` diretamente
   - Como deveria ser: aplicar bônus no score e recalcular mod do score final

6. **Seed de rolagem de HP usa `p.name` sem garantia de unicidade/esquema**
   - Arquivo: `app.js`
   - Função: `ensureHpRollsForCharacter`
   - Erro: risco de colisão de seed em personagens com metadados iguais
   - Como deveria ser: usar id estável único do personagem para seed

---

## Comandos executados na auditoria

- `rg --files | head -n 200`
- `rg -n "hp_total|magic_points_total|ac_total|initiative|proficiency|saving|skill|attack_bonus|spell|speed|passive" app.js src tests data/generated/classes.db.json data/generated/races.db.json`
- `rg -n "function .*calc|recalc|derive|compute|proficiencyBonus|attributeMods|savingThrows|skillModifiers|ac|armor|initiative|passive|magic_points|hp_total|speed_total|spell_save|spell_attack|attack_bonus" app.js`
- `sed -n '700,880p' app.js`
- `sed -n '2200,2465p' app.js`
- `nl -ba app.js | sed -n '740,930p'`
- `nl -ba app.js | sed -n '1380,2445p'`
- `nl -ba app.js | sed -n '2928,3028p'`
- `nl -ba data/generated/classes.db.json | sed -n '1,220p'`
- `nl -ba data/rpg_srd_base.json | sed -n '250,360p'`
- `nl -ba data/rpg_srd_base.json | sed -n '1320,1388p'`
- script Python ad-hoc para simulação dos 2 personagens com as fórmulas vigentes

