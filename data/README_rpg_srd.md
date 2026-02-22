# RPG SRD base

Arquivo-fonte principal: `data/rpg_srd_base.json`.

## Scripts

- Validação de schema/referências:
  - `node scripts/validate-rpg-srd.mjs`
- Geração de seed (bancos de raças/classes para interface):
  - `node scripts/seed-rpg-db.mjs`

## Saída do seed

- `data/generated/races.db.json`
- `data/generated/classes.db.json`

As habilidades clicáveis de raça/classe são geradas a partir de `trait_dictionary` e `class_feature_dictionary`.
