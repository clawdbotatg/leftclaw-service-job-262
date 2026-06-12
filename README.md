# The Proving Grounds

**Live URL:** https://bafybeiez2s3xheot4wuy4jmqo74zcxw7sk3b7547m2ibyr27ou53cgyv4i.ipfs.community.bgipfs.com/

Onchain registry for LeftClaw-verified builds on Base. Builders earn soulbound stamps, leave reviews, and pool bounties for community engagement.

## Live App

Deployed on IPFS via bgipfs (see DEPLOYMENT.md after first deploy).

## Contracts

| Contract | Network | Address |
|----------|---------|---------|
| ProvingGrounds | Base (8453) | [0x72F6325C70d4cdfE14b55036090017B85628Abbc](https://basescan.org/address/0x72F6325C70d4cdfE14b55036090017B85628Abbc) |
| CLAWD Token | Base (8453) | [0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07](https://basescan.org/address/0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07) |

## Mechanics

1. **Stamp** — Soulbound mark minted by burning 1 CLAWD. One per (wallet, build) pair. Proves you interacted with a LeftClaw-verified build.

2. **Review** — Stamp-holders can leave text feedback with an optional ETH tip. Tip weight signals review quality.

3. **Bounty** — Builders fund ETH pools for their registered builds. Owner distributes equally to all stamp-holders (not first-N, anti-gaming).

4. **Burn Hook** — Every stamp claim burns 1 CLAWD, creating deflationary pressure tied to ecosystem engagement.

## Client Actions Required

After deployment, the owner is the deployer wallet. The client must:

1. Call `acceptOwnership()` on ProvingGrounds to complete the Ownable2Step transfer
2. Call `registerBuild(buildContract, name, url, description)` to add builds to the registry

## Development

```bash
# Install dependencies
yarn install

# Start local fork
yarn fork --network base

# Deploy to local fork
yarn deploy

# Start frontend
yarn start

# Build for production
yarn next:build

# Deploy to production (Base mainnet)
yarn deploy --file DeployProvingGrounds.s.sol --network base
```

## Architecture

- `packages/foundry/contracts/ProvingGrounds.sol` — Main registry contract
- `packages/foundry/script/DeployProvingGrounds.s.sol` — Deploy script
- `packages/nextjs/app/page.tsx` — Home: browse all registered builds
- `packages/nextjs/app/build/[address]/page.tsx` — Build detail: stamp, review, bounty

## Security

- `Ownable2Step` ownership (requires `acceptOwnership()`)
- `ReentrancyGuard` on all state-changing functions
- `SafeERC20` for CLAWD token interactions
- CEI pattern (Checks-Effects-Interactions) throughout
- `distributeBounty` is non-reverting on failed ETH sends (individual failures return share to pool)
