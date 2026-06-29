# Arbiter V2

A GenLayer dispute-resolution court.

The project is built as a small on-chain court rather than a static demo: users create records, attach sources, ask GenLayer to reason over them, and keep the decision trail readable.

## Arbiter Brief

- Project folder: `projects/10-arbiter`
- Frontend: static browser app
- Contract package: `contracts/` plus `deployment.json`
- Build status: Schema-valid (55961 bytes, 36 write + 24 view); clean redeploy + 20 write smoke txs finalized incl 4 GenLayer reasoning calls and legacy open/join/rule flow; 40/40 read tests passed; app.js repointed.
- QA notes: Upgraded from a compact no-appeal arbitration MVP into Arbiter V2. Smoke: set_claim_standard / open_dispute / add_obligation / two add_evidence calls / join_dispute / open_review / review_dispute_with_genlayer / open_challenge_window / submit_challenge / re...

## Arbiter Chain Links

- Network: studionet (61999)
- Contract: [0x7353435cE8B7fE0eCdBd59a048e1AC6234532154](https://explorer-studio.genlayer.com/contracts/0x7353435cE8B7fE0eCdBd59a048e1AC6234532154)
- Deploy tx: [0x5a4a03f2...5b54a8](https://explorer-studio.genlayer.com/tx/0x5a4a03f2c8aa97062183cc48fea475107a7a683dd88c1a4534458fcebd5b54a8)
- Deployed at: 2026-06-24T01:15:35.941Z
- Smoke writes recorded: 20

## Adjudication Mechanics

- Primary source: `contracts/arbiter_v2.py` (55,961 bytes)
- Public write/action methods: 36
- Read methods: 24
- GenLayer features: live web rendering, LLM adjudication, validator-comparative consensus, indexed storage, append-only collections

Typical flow: `open_claim` -> `submit` -> `review_dispute_with_genlayer` -> `resolve` -> `challenge` -> `submit_appeal` -> `set_claim_standard` -> `archive_dispute`

Useful reads: `get_claim_count`, `get_dispute_count`, `get_claim`, `get_dispute`, `get_item_count`, `get_item`, `get_stake_count`, `get_stake`

The contract is deliberately larger than a one-method demo. It keeps lifecycle state, evidence records and read endpoints so the UI can show real project state instead of static copy.

## Operator Preview

```powershell
cd C:\Users\aspronim\Desktop\design-skills
npm run preview:start
npm run preview:project -- 10-arbiter
```

Open http://localhost:8080/10-arbiter/.

## Smoke Transactions

- set_claim_standard: [0x3e36b1b7...16d5b2](https://explorer-studio.genlayer.com/tx/0x3e36b1b797e2ae96e520a2b22dbbc5d0b9153dcb0dbaac0485bb8a2a0a16d5b2)
- open_dispute: [0xaeeaebff...9fe045](https://explorer-studio.genlayer.com/tx/0xaeeaebffd74ff3221a6201227f27b94bbdb499d33e9bb5544350d1bdfb9fe045)
- add_obligation: [0x67e2f26f...b9ad35](https://explorer-studio.genlayer.com/tx/0x67e2f26fe6d1f1f000c5e7b7782294af9bf660c8793cb85de4f6c95dbdb9ad35)
- add_evidence_docs: [0x53452d5a...16970c](https://explorer-studio.genlayer.com/tx/0x53452d5a4c90a6f3a883d5eeb4ff31ac4fd60d4040f443c3e586c2b04e16970c)
- add_evidence_web: [0x7221195c...3f0b1c](https://explorer-studio.genlayer.com/tx/0x7221195c788c98badaa73aa408c9b36eda1e26e65b9a93b3153e3201663f0b1c)
- join_dispute: [0x390bf63c...ddeaf0](https://explorer-studio.genlayer.com/tx/0x390bf63c5811c61b1b0e5f847e9475b005a3303bcdb4fb02710ef5146eddeaf0)
- open_review: [0xd1ce9dd2...332b40](https://explorer-studio.genlayer.com/tx/0xd1ce9dd28803a83cd5a2977fc3e4bf755c9af4485ba160d21773ff676a332b40)
- review: [0xa7c3197c...368945](https://explorer-studio.genlayer.com/tx/0xa7c3197c3daef15617c89ad70ef40dedb3181eafe76ec2ae4c4afa1af6368945)

## Release Command

```powershell
cd C:\Users\aspronim\Desktop\design-skills
npm run publish:project -- -Project 10-arbiter -Repo https://github.com/aspro45/<repo-name>.git
```

Replace `<repo-name>` with the GitHub repository name before publishing.

## Public Repo Safety

- Private keys and local vault files are not part of this repository.
- Public addresses, contract source, deployment metadata and frontend code are safe to publish.
- Vercel should receive only this project folder, never the workspace dashboard or vault data.
