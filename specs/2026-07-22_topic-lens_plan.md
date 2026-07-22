# Topic lens (second lens) — implementation plan

A second, parallel lens alongside the existing Deal lens, filtering the
dashboard by `initiative` instead of `deal_tag`. Grew out of noticing that
`ai_gossip` and a handful of other non-deal initiatives (LLMObs, Turso, Kenn,
Ito, Code Review, Bits AI Security, the four Corp Dev cadence channels) have
no way to become dashboard-visible or lens-selectable today — `initiative` is
parsed into `CalendarEvent`/`EmailItem` but never filtered on anywhere, never
present on Slack items at all, and `BriefingConfig` doesn't even expose
`initiatives[]` to the client.

Resolved via `/grill-me` on 2026-07-22. Each open question below is settled;
this doc is the record, not a proposal.

## 1. Relationship between the two lenses

**Mutually exclusive.** Selecting a Topic pill clears any active Deal
selection and vice versa — only one of `dealLens` / `topicLens` is non-null
at a time. `deal_tag` and `initiative` are documented as two different filter
*axes* (see `briefing_schema.md`), not two dials meant to be turned together;
intersection would almost always render empty (an item essentially never
carries a meaningful value on both), and union is confusing to reason about.

**One shared `All`.** Clicking it clears both `dealLens` and `topicLens`.
There is exactly one `All` control in the UI, not one per lens.

## 2. Layout

```
┌────────┬──────────────────────────────────────────────────┐
│        │ Lens:  [Orion] [Sentry] [LangChain] ...           │
│  All   ├──────────────────────────────────────────────────┤
│        │ Topic: [AI Gossip] [LLMObs] [Turso] [Kenn] ...    │
└────────┴──────────────────────────────────────────────────┘
```

- `All` sits to the **left** of both rows (not its own row above them) —
  a dedicated `All`-only row was rejected as wasted vertical space.
- Two stacked rows, not one merged row. A single flat pill list would
  reintroduce exactly the ambiguity mutual-exclusivity is meant to resolve
  ("why did picking a topic clear my deal?") — the row labels (`Lens:` /
  `Topic:`) plus separate rows make the two axes visually legible even when
  pills wrap on a narrow window.
- Topic row hides itself when there are zero eligible initiatives, same as
  the Deal row hides itself at zero active deals today.
- All Topic pills share **one fixed accent color**, distinct from the Deal
  row's palette — no per-topic `color` field. (Deals have had an optional
  `color` field for months and nobody's used it; per-item color isn't a
  real need here either, and the row-level color is what carries the
  "these are the other axis" signal, not the individual pill.)

## 3. Which initiatives get a pill: `show_in_lens`

Not every initiative should be lens-selectable — several are pure tagging
plumbing (expense reports, admin) that would just clutter the row. New
opt-in field on each `initiatives[]` entry in `briefing_config.yaml`:

```yaml
- id: "ai_gossip"
  label: "AI Gossip"
  deal_tag: null
  show_in_lens: true          # NEW — default false/omitted
  keywords: [...]
```

**Eligibility rule:** an initiative gets a Topic pill iff
`deal_tag == null AND show_in_lens == true`. The `deal_tag != null`
exclusion is automatic and not configurable — those initiatives
(zest_security, orion_security, sentry, langchain, langfuse, milana,
meticulous, altertable, crafting) are already reachable via the Deal lens;
giving them a second, redundant Topic pill would be confusing.

### Config change required now

In `/Users/stefan.marx/claude-chats/src/daily/briefing_config.yaml`, add
`show_in_lens: true` to these initiatives:

| id | show_in_lens |
|---|---|
| `ai_gossip` | ✅ |
| `llmobs` | ✅ |
| `turso` | ✅ |
| `kenn` | ✅ |
| `ito` | ✅ |
| `code_review` | ✅ |
| `bits_ai_security` | ✅ |
| `corpdev_backroom` | ✅ |
| `corpdev_eng_backroom` | ✅ |
| `corpdev_weekly` | ✅ |
| `corpdev_biweekly` | ✅ |
| `culminate_369` | leave unflagged |
| `q1_bod` | leave unflagged |
| `expenses_admin` | leave unflagged |
| `internal_engineering` | leave unflagged — keyword list is too broad (demo, prototype, poc, "eng chat," "internal build," "early experiment") to be a usable lens; it'd just become a second `All` for anything internal |

All 24 initiatives keep their existing tagging behavior (keyword matching
against email/Slack/calendar) regardless of `show_in_lens` — this field only
controls pill visibility, not tagging.

## 4. Slack tagging granularity: message-level, not channel-level

`deal_tag` on Slack today lives only on `SlackChannel` — a whole channel is
either "Orion" or it isn't. That's fine for dedicated deal channels, but
several of the new Topic-eligible channels are shared/mixed-content
(`#corpdev-backroom`, the weekly/biweekly channels) — most traffic in them
won't match the initiative's keywords even when some does.

**Decision: `initiative` lives on `SlackMessage`, not `SlackChannel`.** This
also just closes a gap — `briefing_schema.md`'s Step B already says to scan
"every calendar event, email item, and Slack message" for initiative
keywords; the schema simply never gave Slack messages anywhere to put the
result.

**Filtering behavior when Topic lens is active:** for each channel, keep
only messages where `message.initiative === topicLens`; if a channel ends
up with zero surviving messages, drop the channel from the list entirely
(no "no matching messages" placeholder rendered per-channel — the existing
section-level empty state already covers the all-empty case).

## 5. New toggle: "Only channels with messages"

Generalizes the drop-empty-channels behavior in §4 into a standalone,
user-facing control — not just a hardcoded Topic-lens behavior. Independent
of which lens (if any) is active: after whatever filtering the current lens
state produces, if the toggle is on, drop any channel whose (post-filter)
message list is empty. This also quietly helps the `All` / Deal-lens views —
a VIP channel that was just quiet won't clutter the list either.

- **Default: on.**
- **Session-only state**, same lifecycle as `dealLens`/`topicLens` (resets
  to "on" every app load, no persistence to `Settings`/disk). This is a
  "declutter my current view" control, not a durable preference — giving it
  a home in `Settings` would mean a new Rust `Settings` field, a default for
  existing users' `settings.json`, and a new `DashboardSettings.svelte`
  control, all for something whose whole value is "quickly peek, then go
  back to normal."
- Lives on the Slack tab itself (small toggle near the existing
  `Since {slack.since}` line), not in the lens bar.

## 6. Required schema / backend changes

### 6a. `briefing_schema.json` (authoritative source: `Yarvis/ai/briefing_schema.json`)

Add `initiative` to `slack_message`:

```jsonc
"slack_message": {
  "properties": {
    "author": { "type": ["string", "null"] },
    "timestamp": { "$ref": "#/$defs/iso_datetime_or_null" },
    "summary": { "type": "string" },
    "links": { "type": "array", "items": { "$ref": "#/$defs/named_link" } },
    "action": { "type": ["string", "null"] },
    "initiative": { "type": ["string", "null"] }   // NEW
  }
  // not added to `required` — optional/nullable so older daily.json
  // files without it still validate
}
```

No change needed to `action_item`'s schema — it already lists `initiative`
in both `required` and `properties` (see §6b, this is a pass-through bug,
not a schema gap).

Per this repo's own invariant ("`briefing_schema.json` and
`validate_briefing.py` MUST change together"): no *functional* validator
change is needed here — we're only adding a property of an already-supported
shape (`type: ["string","null"]`, optional) to an existing object schema,
and both `properties` and `type`-as-list are already ✅ in
`validate_briefing.py`'s supported-feature table. Still run the validator
against a hand-built sample `daily.json` with a tagged Slack message as a
smoke test before merging.

### 6b. Rust — `src-tauri/src/commands/dashboard.rs`

Two structs are missing a field the schema already promises them:

- `SlackMessage` needs `initiative: Option<String>` (`#[serde(default)]`) —
  new, matches §6a.
- `ActionItem` needs `initiative: Option<String>` (`#[serde(default)]`) —
  **pre-existing bug**, found while designing this feature. The schema has
  required `initiative` on `action_item` all along; the Rust struct just
  never had a field for it, so serde silently drops it on every deserialize.
  Fix this regardless of whether the rest of this plan ships.

New config-side types:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitiativeDef {
    pub id: String,
    pub label: String,
}
```

`BriefingConfig` gains `initiatives: Vec<InitiativeDef>` — but this is
**computed at parse time, not a raw pass-through** like `active_deals` is.
`read_config` needs an internal (non-exported) struct to deserialize the raw
YAML `initiatives[]` shape (`id`, `label`, `deal_tag: Option<String>`,
`show_in_lens: bool` — `keywords` can be ignored/skipped, the client never
needs it), then filter to `deal_tag.is_none() && show_in_lens` and map down
to the public `InitiativeDef { id, label }` before returning. This keeps the
eligibility rule in one place (Rust) rather than re-implementing "which
initiatives are pill-worthy" in Svelte — the client just renders whatever
list it's handed, exactly like it does for `active_deals` today.

### 6c. TypeScript — `src/lib/types/index.ts`

```ts
export interface InitiativeDef {
	id: string;
	label: string;
}
```

- `BriefingConfig.initiatives: InitiativeDef[]` — new.
- `SlackMessage.initiative: string | null` — new.
- `ActionItem.initiative: string | null` — new (bug fix, see 6b).

### 6d. `daily-dashboard-SKILL.md` (source: `Yarvis/ai/daily-dashboard-SKILL.md`)

Step B ("Assign `initiative`") already describes scanning Slack messages
and Action items; no *logic* change needed. Add an explicit note that these
two item types now have a real field to write the result into (previously
true for calendar/email only in practice, since nothing downstream read it
for Slack/actions) — mostly to prevent a future contributor from assuming
Slack/action initiative-tagging is optional or was never implemented on
purpose.

### 6e. Rebuild + reinstall

`briefing_schema.json` and `daily-dashboard-SKILL.md` are edited in
`Yarvis/ai/` (the authoritative source per `ai/README.md`), not in the
installed skill location. After editing:

1. Run `Yarvis/ai/build_skill.py` to regenerate `dist/daily-dashboard.zip`.
2. Reinstall per the script's own instructions (re-unzip into
   `~/.claude/skills/` for Claude Code/Cowork, or re-upload for
   Claude Desktop/claude.ai) so the next `/daily-dashboard` run actually
   uses the updated schema and prompt.

Note `Yarvis/ai/briefing_config.yaml` is a stale local sample (currently
describes Aspen/PuppyGraph/Raindrop-era deals) — it is explicitly excluded
from the bundle and not the file to edit for §3's config change. The live
config is `/Users/stefan.marx/claude-chats/src/daily/briefing_config.yaml`.

## 7. Frontend changes

### 7a. `dashboardView.svelte.ts`

- New `topicLens: string | null` state, parallel to `dealLens`.
- Setting either clears the other (mutual exclusivity, §1).
- `lensActive` → `dealLens !== null || topicLens !== null`.
- `lensName` → resolves from whichever is active: deal name via
  `dashboard.dealById`, or initiative label via a new
  `dashboard.initiativeById`.
- `onlyChannelsWithMessages` toggle state, default `true` (§5).
- `filteredChannels` rewritten to handle three cases before the toggle pass:
  - Deal lens active → unchanged: whole-channel keep/drop on
    `ch.deal_tag === dealLens`.
  - Topic lens active → per-message filter: map each channel to
    `{ ...ch, messages: ch.messages.filter(m => m.initiative === topicLens) }`,
    then drop channels left with zero messages.
  - Neither active → pass through unfiltered.
  - Then, regardless of the above: if `onlyChannelsWithMessages`, drop any
    channel whose (possibly already-filtered) `messages` is empty.
- `filteredActions`, `filteredEvents`, `filteredEmailActToday`,
  `filteredEmailFyi` each gain a topic-lens branch:
  `topicLens ? all.filter(x => x.initiative === topicLens) : (dealLens ? ... : all)`.
- `counts` and `searchItems` need no changes beyond what falls out of the
  above — both already derive from the filtered slices, so whichever lens
  is active is automatically respected (mirrors how the Cmd-K palette
  already "respects the active deal lens" per the original plan).

### 7b. New component: `TopicLensBar.svelte`

Near-identical to `DealLensBar.svelte` (same `Chip` usage, same
wrap/hide-at-zero behavior), sourcing `initiatives: InitiativeDef[]`
instead of `deals: ActiveDealDef[]`, and rendering **without** its own
`All` pill (that's now owned by the shared control, §7c). Row label
`Topic:` instead of `Lens:`.

### 7c. `DealLensBar.svelte` — extract `All`

Currently renders its own inline `All` chip (lines 19–24). That needs to
move out into a new small wrapper — e.g. `LensBar.svelte` — that renders:
`All` chip (left) + `DealLensBar` (pills only) stacked above
`TopicLensBar` (pills only) to its right. `DealLensBar` and `TopicLensBar`
become pure pill-list renderers; the wrapper owns `All`'s
`onclick={() => { onSelectDeal(null); onSelectTopic(null); }}` and its
`active={selected === null && topicSelected === null}` state.

### 7d. `+page.svelte`

Replace the current:

```svelte
<DealLensBar
	deals={dashboard.config?.active_deals ?? []}
	selected={view.dealLens}
	onSelect={(id) => (view.dealLens = id)}
/>
```

with the new `LensBar` wrapper, passing both `dashboard.config?.active_deals`
and `dashboard.config?.initiatives`, and both `view.dealLens` /
`view.topicLens` with their respective setters (each setter also nulling
out the other, per §1 — or the wrapper does this internally per §7c).

### 7e. `SlackTab.svelte`

Add the "Only channels with messages" toggle control (§5) near the
`Since {slack.since}` line. No change to the per-channel/per-message
rendering itself — `channels` arriving as a prop is already the fully
filtered set by the time it reaches this component, same as today.

## 8. What we're not doing this pass

- No per-topic `color` field (§2).
- No persistence of the "only channels with messages" toggle (§5).
- No URL-hash for either lens (matches the original Deal-lens plan's own
  deferral).
- No multi-select within a single lens row (still one deal *or* one topic
  at a time, never two of the same axis).
- No backfill/migration of historical `daily.json` files to add the new
  Slack/action `initiative` values retroactively — only new briefings will
  carry it.

## 9. Files touched

| File | Repo | Change |
|---|---|---|
| `src/daily/briefing_config.yaml` | claude-chats | add `show_in_lens: true` to 11 initiatives (§3) |
| `ai/briefing_schema.json` | Yarvis | add `initiative` to `slack_message` (§6a) |
| `ai/daily-dashboard-SKILL.md` | Yarvis | clarify Step B now writes to Slack/action `initiative` (§6d) |
| `ai/validate_briefing.py` | Yarvis | no functional change expected; smoke-test only (§6a) |
| `src-tauri/src/commands/dashboard.rs` | Yarvis | `InitiativeDef`, `BriefingConfig.initiatives`, `SlackMessage.initiative`, `ActionItem.initiative` (§6b) |
| `src/lib/types/index.ts` | Yarvis | `InitiativeDef`, `BriefingConfig.initiatives`, `SlackMessage.initiative`, `ActionItem.initiative` (§6c) |
| `src/lib/components/dashboard/TopicLensBar.svelte` | Yarvis | new (§7b) |
| `src/lib/components/dashboard/DealLensBar.svelte` | Yarvis | drop internal `All` (§7c) |
| `src/lib/components/dashboard/LensBar.svelte` | Yarvis | new wrapper owning shared `All` (§7c) |
| `src/lib/stores/dashboardView.svelte.ts` | Yarvis | `topicLens`, mutual exclusion, `onlyChannelsWithMessages`, updated filters (§7a) |
| `src/routes/dashboard/+page.svelte` | Yarvis | wire `LensBar` in place of `DealLensBar` (§7d) |
| `src/lib/components/dashboard/tabs/SlackTab.svelte` | Yarvis | toggle control (§7e) |
| `dist/daily-dashboard.zip` | Yarvis | rebuild + reinstall after schema/prompt changes (§6e) |

## 10. Suggested implementation order

1. Config change (§3) — cheap, unblocks nothing else but is a pure data
   edit, do it first and separately.
2. Schema + Rust + TS (§6) — the plumbing; `initiatives[]` shows up in
   `read_config` and can be sanity-checked (e.g. temporarily logged) before
   any UI exists to consume it.
3. `dashboardView.svelte.ts` (§7a) — filtering logic, testable against
   existing `daily.json` fixtures even before the new components render.
4. Components + wiring (§7b–7e) — UI last, once the data layer is proven.
5. Rebuild/reinstall the skill (§6e) so the next real `/daily-dashboard` run
   actually populates Slack/action `initiative` end to end.

## Branch + PR

- Branch `feature/topic-lens`.
- One PR. Archive this plan (already dated) once merged — no rename needed,
  unlike the `specs/plan.md` convention, since it was written with its
  final date already.
