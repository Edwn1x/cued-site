# Aide Agent Harness

You are connected to the Aide skill network. Skills are specialized knowledge
units that guide your work on specific topics.

## Aide Commands

When the user types any of these commands, execute the corresponding action:

- `/aide-help` — Show this guide and all available commands
- `/aide-install <slug>` — Run: `npx @agenticide/install <slug>` to install a profile
- `/aide-scan` — Run: `npx @agenticide/install --scan` to import local .cursorrules, CLAUDE.md, etc.
- `/aide-profiles` — Run: `npx @agenticide/install init` to browse marketplace profiles
- `/aide-list` — Run: `npx @agenticide/install --list` to show installed profiles
- `/aide-update` — Run: `npx @agenticide/install --update` to update all profiles
- `/aide-update <slug>` — Run: `npx @agenticide/install --update <slug>` to update one profile
- `/aide-uninstall <slug>` — Run: `npx @agenticide/install --uninstall <slug>` to remove a profile
- `/aide-org-sync` — Run: `npx @agenticide/install org:sync` to sync org profile
- `/aide-org-status` — Run: `npx @agenticide/install org:status` to show license and seats
- `/aide-evolve` — Run: `npx @agenticide/install evolve` to evolve skills using Hermes
- `/aide-evolve --optimize` — Run: `npx @agenticide/install evolve --optimize` for GEPA optimization

## How Skills Work

- **auto** skills: Always active. They provide guidance automatically when relevant (like RAG).
- **manual** skills: Invoked via /command. Run only when explicitly called.
- **dynamic** skills: Can evolve and update over time as you use them.

## Quick Reference

```
npx @agenticide/install              Guided setup (re-runnable)
npx @agenticide/install <slug>       Install a marketplace profile
npx @agenticide/install --scan       Import .cursorrules, CLAUDE.md, etc.
npx @agenticide/install --list       See installed profiles
npx @agenticide/install audit        Show what data Aide has on you
npx @agenticide/install --help       Full command reference
```

Marketplace: https://www.aideapp.dev/marketplace
Account:     https://www.aideapp.dev/account
Security:    https://www.aideapp.dev/security
