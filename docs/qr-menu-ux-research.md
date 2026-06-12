# QR Menu UX Research — Average Check Size

**Date:** 2026-06-12  
**Scope:** Dine-in mobile QR menu, shortlist-to-waiter interaction model (no checkout).  
**Method:** 111-agent adversarial verification harness. 28 sources fetched, 89 claims extracted, 25 top claims verified by 3-vote adversarial panel.  
**Result:** 3 confirmed / 22 killed (88% kill rate — most "menu psychology" numbers are vendor marketing fiction).

---

## Confirmed Findings

### 1. Edge placement within categories — HIGH confidence (vote 3-0)

Items at **position 0 or last** in a category are chosen ~55% of the time vs. 45% for middle positions — a ~22% relative advantage.

**Source:** Dayan & Bar-Hillel (2011, *Judgment and Decision Making*) — Study 1 (n=240 lab, p<.001); Study 2 (n=951 real café orders, p<.05). Item rotation controlled for inherent popularity.

**Caveat:** Paper-menu / fixed-counter context. No peer-reviewed replication on mobile vertical-scroll interfaces.

**Sprint action:** Set `sort_order` in `menu.dishes` so the highest-margin dish in each category is at index 0, second-highest is last — never buried in the middle. Zero UI work.

---

### 2. Category pill nav is purposeful, not exploratory — MEDIUM confidence (vote 2-1)

Guests use in-page anchor nav only when they already know what they want. **Initial exploration defaults to linear scrolling.** The pill strip alone will not drive cross-category discovery.

**Source:** NNG qualitative usability study (n=11, October 2023).

**Implication:** The featured strip is the primary discovery surface for high-margin items. The pills serve returning or decisive guests.

**Sprint action:** Curate the featured strip to **3–5 items** (not 1, not 8+). Give it visual weight before the pills — currently no eyebrow/header. A minimal label (e.g. «— в фокусе») gives it hierarchy without reinstating the dropped title. One `FeaturedStrip.tsx` edit.

---

### 3. ShortlistSheet as precommitment device — MEDIUM confidence (vote 2-1)

Guests who externalize their intended order before the waiter interaction are **more likely to follow through** — the shortlist binds them to a prior deliberate decision.

**Source:** Precommitment theory (Strotz 1955; Thaler & Benartzi 2004; Ariely & Wertenbroch 2002), via [behavioraleconomics.com](https://www.behavioraleconomics.com/resources/mini-encyclopedia-of-be/precommitment/).

**Caveat:** No restaurant-specific study measures shortlist-to-order conversion. Transfer from savings/deadlines contexts is theoretical. The related "commitment-consistency / social pressure from tapping heart" claim was voted 1-2 and excluded.

**Sprint action:** Show a **running price total** in ShortlistSheet and on the HeartCounter badge. Externalizing the monetary commitment before the waiter arrives is where the precommitment effect compounds. This is a React state change — sum prices from the shortlist array already in `MenuApp.tsx` state.  
Edge case: per-100g items (steaks, ribs, ossobuco) have variable price — show as «от X ₽» or exclude from the sum with a footnote.

---

## Killed Claims — Do Not Use for Prioritization

All originated from vendor blogs or unverifiable secondary citations:

| Claim | Vote | Source type |
|---|---|---|
| Photos increase orders 6.5–35% | 0-3 | Limetray / Snappr vendor blogs |
| Chef's pick gets 35% higher CTR | 0-3 | No control group |
| Descriptive language lifts sales 27% | 0-3 | Single unverifiable blog |
| Golden triangle drives 25% higher sales | 0-3 | Paper-menu eye-tracking; no digital replication |
| Dollar sign causes "pain of paying" → lower spend | 1-2 | Cornell study exists but magnitude claim failed |
| Anchor pricing makes cheaper items feel like value | 0-3 | ChowNow blog, no primary source |
| QR codes reduce check average 10% | 0-3 | PYMNTS/Paytronix stat unverifiable |
| 47% consumers uncomfortable with QR | 0-3 | Restaurant Dive stat misattributed |
| Social proof labels ("популярное") boost CTR | 0-3 | No controlled study |
| Guests don't scroll — top items dominate | 0-3 | ChowNow blog, no data |

---

## Open Questions (worth testing at МОСТ)

1. **Does edge placement hold on mobile vertical scroll?** A/B test: swap `sort_order` of two dishes in Закуски, observe shortlist rate over 2–4 weeks. No UI change needed.

2. **What is the actual shortlist-to-order conversion?** Of dishes added to ShortlistSheet, what fraction get ordered? Waiter observation or post-visit survey. If >80% → precommitment is working. If ~40% → the handoff breaks somewhere.

3. **Does showing a subtotal increase or decrease items shortlisted?** Aspirational bundling (see the full order come together → add more) vs. pain-of-paying (see the number → pull back). Needs a venue-specific test.

4. **Russian/CIS market specifics:** No verified CRO data distinct from global patterns was found in any indexed source. Global patterns are the best available prior.

---

## Priority Order for Next Sprint

1. Reorder `sort_order` in DB — top-margin dishes to edge positions in each category
2. Strengthen featured strip — 3–5 items, add visual eyebrow for weight
3. Add running subtotal to ShortlistSheet + HeartCounter badge
