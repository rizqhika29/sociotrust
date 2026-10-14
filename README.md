# SocioTrust — On-chain Identity Verification

Link your social, prove your trust. SocioTrust verifies users' identities by
checking their social media profiles for specific challenge messages and linking
them to on-chain accounts — adjudicated by decentralized AI validators on
[GenLayer](https://docs.genlayer.com/), no oracles, no intermediaries.

Live contract (GenLayer Studio Network): `0x71612446a1f9834Af9c495D12FC495EbD10FAC92`

## How it works

1. `request_challenge()` — the registry issues a unique phrase bound to your address.
2. You publish that phrase on a public social page (gist, post, blog).
3. `verify_identity(platform, username, proof_url)` — 1 leader + 4 validators
   independently fetch the page and must agree (Equivalence Principle) before the
   seal is stored on-chain.
4. Anyone can inspect a seal via `get_identity()` / `is_verified()`.

## Repo layout

```
sociotrust.py              # contract source of truth
contracts/sociotrust.py    # deploy copy used by tests/CLI
tests/direct/              # fast in-memory tests (pytest)
tests/integration/         # full-consensus tests on Studio (gltest)
frontend/                  # Next.js dApp (landing, verify wizard, lookup, registry)
```

## Contract dev

```bash
python -m pytest tests/direct/ -v
gltest tests/integration/ -v -s --network studionet
genlayer deploy --contract contracts/sociotrust.py   # network: studionet
```

## Frontend dev

```bash
cd frontend
cp .env.example .env
npm install
npm run dev        # http://localhost:3000
```

## Deploy frontend to Vercel

- Import this repo in Vercel, set **Root Directory** to `frontend`.
- Framework preset: Next.js. Build command `npm run build` (default).
- Environment variables:
  - `NEXT_PUBLIC_CONTRACT_ADDRESS=0x71612446a1f9834Af9c495D12FC495EbD10FAC92`
  - `NEXT_PUBLIC_EXPLORER=https://explorer-studio.genlayer.com`
