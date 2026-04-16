---
name: AI Provider Architecture
description: Decoupled multi-provider AI system with Lovable Gateway as default, fallback support, and smart routing
type: feature
---

## Provider Architecture
- `/features/ai/providers/` — lovable.ts, openai.ts, gemini.ts, custom.ts
- All providers implement `AIProviderAdapter` interface from `providers/types.ts`
- `aiRouter.ts` — smart router with fallback chain, runtime enable/disable
- Currently all models route through Lovable AI Gateway edge function
- Direct provider adapters are placeholders for future API key integration

## Edge Functions
- `generate-app` — validates user, checks credits, calls AI, parses response, saves version, deducts credits, rollback on failure
- `estimate-cost` — heuristic cost estimation based on prompt complexity
- `admin-actions` — user management, credit assignment, plan changes (admin only)

## Credit Flow (Backend)
1. Check credits before AI call
2. Deduct credits optimistically
3. Call AI Gateway with tool calling for structured output
4. On success: record transaction, save version
5. On failure: rollback credits, record refund transaction

## Models Available
- openai/gpt-5, openai/gpt-5-mini
- google/gemini-2.5-pro, google/gemini-3-flash-preview (default), google/gemini-2.5-flash-lite
