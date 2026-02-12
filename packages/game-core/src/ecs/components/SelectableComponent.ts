/**
 * Selectable component — marks an entity as selectable by the player.
 */
export interface SelectableComponent {
  selected: boolean;
  hoverHighlight: boolean;
}

export const SELECTABLE = 'Selectable' as const;

export function createSelectable(
  selected = false,
  hoverHighlight = false,
): SelectableComponent {
  return { selected, hoverHighlight };
}

