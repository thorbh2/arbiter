# Arbiter

Arbiter is a GenLayer arbitration protocol for staked disputes, evidence review, rulings, challenges, appeals and reputation.

This repository is a public proof package: it includes the product UI, the deployed GenLayer Studionet contract source, deployment metadata, finalized smoke transactions, and test evidence. Local wallet secrets are not included.

## Live System

| Surface | Link |
| --- | --- |
| App | https://arbiter-seven-woad.vercel.app |
| GitHub | https://github.com/thorbh2/arbiter |
| Contract | https://explorer-studio.genlayer.com/contracts/0x7353435cE8B7fE0eCdBd59a048e1AC6234532154 |
| Deploy tx | https://explorer-studio.genlayer.com/tx/0x5a4a03f2c8aa97062183cc48fea475107a7a683dd88c1a4534458fcebd5b54a8 |
| Vercel inspect | https://vercel.com/aspros-projects-07dbbeb8/arbiter/LSGN3ytMDrFSCQBaBkf2X1gvbXYZ |

## Why Arbiter Exists

A GenLayer dispute-resolution court. Claimants and respondents each stake GEN, file arguments and evidence, GenLayer reviews the public source record, challenges and appeals refine the ruling, and the final rule/archive/reputation path remains compatible with the existing docket frontend.

The frontend keeps the original product experience, while the contract adds a reviewable on-chain lifecycle: source records, GenLayer reasoning, challenge and appeal paths, indexed reads, and an audit trail that can be inspected after deployment.

## Contract Architecture

| Area | Detail |
| --- | --- |
| Contract | `contracts/arbiter_v2.py` |
| Size | 55961 bytes |
| Network | GenLayer Studionet, chain id `61999` |
| Write methods | 36 |
| Read methods | 24 |
| GenLayer features | live web rendering, LLM execution, validator-comparative consensus |
| Deployment wallet | 0xb13a7433B52c6619Df3Ce6ff35C870b3d29D5C83 |
| Contract address | 0x7353435cE8B7fE0eCdBd59a048e1AC6234532154 |

Architecture note:

> Arbiter V2 (# v0.2.16), 55961 bytes, 36 write + 24 view. Objects: Dispute/Claim, Stake, Obligation, Evidence, Review, Challenge, Appeal, Reputation/Profile + AuditEntry. Lifecycle OPEN->REVIEWING->REVIEWED->CHALLENGE_WINDOW->APPEALED->RESOLVED->ARCHIVED. GenLayer nondet (web.render + exec_prompt inside eq_principle.prompt_comparative) reviews both party arguments, public source evidence, challenges and appeals; strict JSON normalization, confidence/trigger bps, URL validation and prompt-injection guardrails. Backward-compatible open_dispute/join_dispute/rule/get_dispute/get_dispute_count keep the static arbitration app intact.

Core smoke flow:

```text
set_claim_standard
  -> open_dispute
  -> add_obligation
  -> add_evidence_docs
  -> add_evidence_web
  -> join_dispute
  -> open_review
  -> review
  -> open_challenge_window
  -> submit_challenge
  -> resolve_challenge
  -> submit_appeal
  -> resolve_appeal
```

## Verification Trail

| Step | Transaction |
| --- | --- |
| Set Claim Standard | https://explorer-studio.genlayer.com/tx/0x3e36b1b797e2ae96e520a2b22dbbc5d0b9153dcb0dbaac0485bb8a2a0a16d5b2 |
| Open Dispute | https://explorer-studio.genlayer.com/tx/0xaeeaebffd74ff3221a6201227f27b94bbdb499d33e9bb5544350d1bdfb9fe045 |
| Add Obligation | https://explorer-studio.genlayer.com/tx/0x67e2f26fe6d1f1f000c5e7b7782294af9bf660c8793cb85de4f6c95dbdb9ad35 |
| Add Evidence Docs | https://explorer-studio.genlayer.com/tx/0x53452d5a4c90a6f3a883d5eeb4ff31ac4fd60d4040f443c3e586c2b04e16970c |
| Add Evidence Web | https://explorer-studio.genlayer.com/tx/0x7221195c788c98badaa73aa408c9b36eda1e26e65b9a93b3153e3201663f0b1c |
| Join Dispute | https://explorer-studio.genlayer.com/tx/0x390bf63c5811c61b1b0e5f847e9475b005a3303bcdb4fb02710ef5146eddeaf0 |
| Open Review | https://explorer-studio.genlayer.com/tx/0xd1ce9dd28803a83cd5a2977fc3e4bf755c9af4485ba160d21773ff676a332b40 |
| Review | https://explorer-studio.genlayer.com/tx/0xa7c3197c3daef15617c89ad70ef40dedb3181eafe76ec2ae4c4afa1af6368945 |
| Open Challenge Window | https://explorer-studio.genlayer.com/tx/0xf74bea1d1c479008642efb41db03e2e8f028aa5cb71d7cc0b2d482f697be8c56 |
| Submit Challenge | https://explorer-studio.genlayer.com/tx/0x29be244e04803e37c6c1f957f89faa5481c8259447529bc5ef1bad7dd6d97f8e |
| Resolve Challenge | https://explorer-studio.genlayer.com/tx/0x1e1d057f81bd6de8dbe5708378ab1d82c82880a5d1aa7425484a60cc070b5a49 |
| Submit Appeal | https://explorer-studio.genlayer.com/tx/0xc0e72aba5763e49f7bb78d202e1d5368455aeae71a4e432101992167a46839a0 |
| Resolve Appeal | https://explorer-studio.genlayer.com/tx/0xafecc1950629e38ddfdc126fdcef72663191ea7cc72efba7a980ef0c6dbebffa |
| Rule | https://explorer-studio.genlayer.com/tx/0x6105593b22660ed88c2e5edaff8c5e5499005814771d07d6ce9785a21bf9fd25 |

Test result:

```text
Schema valid
20 smoke writes finalized
40/40
Static frontend bundled for standalone Vercel deployment
```

## Frontend

Arbiter ships as a standalone static app:

- wallet connection through the bundled browser client
- GenLayer reads through `genlayer-js`
- writes routed through the connected EVM wallet
- local `shared/` client files included so Vercel does not depend on the private workspace router
- deployed contract address pinned in `app.js` and `deployment.json`

## Run Locally

From the private workspace:

```powershell
cd C:\Users\aspronim\Desktop\design-skills
npm run preview:start
npm run preview:project -- 10-arbiter
```

Open:

```text
http://localhost:8080/10-arbiter/
```

## Publish / Redeploy

```powershell
cd C:\Users\aspronim\Desktop\design-skills
npm run publish:project -- -Project 10-arbiter -Repo https://github.com/thorbh2/arbiter.git
```

Vercel production redeploy from a clean project folder:

```powershell
npx --yes vercel@latest --prod --yes
```

## Repository Safety

This public repository intentionally excludes local secrets:

- no private keys
- no vault files
- no `.env` files
- no `.vercel` project state
- no local dashboard data

Public files include frontend code, contract source, deployment metadata, tests, and non-sensitive proof links.
