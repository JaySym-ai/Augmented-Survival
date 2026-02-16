/**
 * InventoryGrid — 5x5 inventory grid (25 slots).
 * Displayed when the resource bar is in expanded mode.
 */
export class InventoryGrid {
  private el: HTMLDivElement;
  private slots: HTMLDivElement[] = [];
  private onSlotClick: ((index: number) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'ui-inventory-grid';

    for (let i = 0; i < 25; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot empty';
      slot.dataset.index = String(i);
      slot.addEventListener('click', () => this.handleSlotClick(i));
      this.el.appendChild(slot);
      this.slots.push(slot);
    }

    parent.appendChild(this.el);
  }

  private handleSlotClick(index: number): void {
    if (this.onSlotClick) {
      this.onSlotClick(index);
    }
  }

  setSlotClickHandler(handler: (index: number) => void): void {
    this.onSlotClick = handler;
  }

  setSlotContent(index: number, icon: string, count?: number): void {
    if (index < 0 || index >= 25) return;
    const slot = this.slots[index];
    slot.innerHTML = '';
    slot.classList.remove('empty');

    if (icon) {
      const iconEl = document.createElement('span');
      iconEl.className = 'inv-icon';
      iconEl.textContent = icon;
      slot.appendChild(iconEl);
    }

    if (count !== undefined && count > 1) {
      const countEl = document.createElement('span');
      countEl.className = 'inv-count';
      countEl.textContent = String(count);
      slot.appendChild(countEl);
    }

    if (!icon) {
      slot.classList.add('empty');
    }
  }

  dispose(): void {
    this.el.remove();
  }
}
