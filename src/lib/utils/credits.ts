// Cost formatting helpers used by every Studio param panel.
// Rule (see docs/credit-system-design.md):
//   1 credit = $0.001 retail
//   credits charged = ceil(api_cost_usd * 1000) * 2  (50% margin)
// We expose a single `costToCredits` that derives the user-facing number
// from the same `costUsd` the existing components already compute.

export function costToCredits(costUsd: number | null | undefined): number {
  if (!costUsd || costUsd <= 0) return 0;
  return Math.ceil(costUsd * 1000) * 2;
}

export function formatCredits(credits: number): string {
  return credits.toLocaleString('en-US');
}

// Convenience for buttons: the full label used on every Generate CTA.
//   formatCostBadge(0.225) -> '450 credits'
//   formatCostBadge(null) -> '' (caller should fall back to FREE label)
export function formatCostBadge(costUsd: number | null | undefined): string {
  const credits = costToCredits(costUsd);
  return credits > 0 ? `${formatCredits(credits)} credits` : '';
}
