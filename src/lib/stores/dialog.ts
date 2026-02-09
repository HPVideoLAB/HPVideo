import { writable, type Writable } from 'svelte/store';
import type { SvelteComponent } from 'svelte';

export type DialogAction = {
  labelKey: string; // i18n key（英文句子）
  type?: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error';
  closeOnClick?: boolean; // 默认 true
  onClick?: () => void | Promise<void>;
};

export type DialogConfirm = {
  // ✅ 是否显示默认 Confirm/Cancel
  enabled?: boolean;

  // ✅ 按钮文案 key（默认 Confirm / Cancel）
  confirmLabelKey?: string;
  cancelLabelKey?: string;

  // ✅ 确认按钮样式（默认 primary）
  confirmType?: DialogAction['type'];

  // ✅ 点击确认/取消时回调（可 async）
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;

  // ✅ 用于 confirm() Promise 的 resolve
  _resolve?: (v: boolean) => void;
};

export type DialogState = {
  open: boolean;

  titleKey?: string;
  bodyTextKey?: string;
  bodyHtml?: string;

  bodyComponent?: any;
  bodyProps?: Record<string, any>;

  showClose?: boolean;

  actions?: DialogAction[];
  widthClass?: string;

  // ✅ 点击遮罩关闭（默认 true）
  closeOnBackdrop?: boolean;

  // ✅ Confirm/Cancel（默认关）
  confirm?: DialogConfirm;
};

const initial: DialogState = {
  open: false,
  showClose: true,
  widthClass: 'max-w-[760px]',
  actions: [],
  closeOnBackdrop: true,
  confirm: { enabled: false },
};

export const dialogStore: Writable<DialogState> = writable(initial);

export function openDialog(next: Omit<DialogState, 'open'> & { open?: boolean }) {
  dialogStore.set({
    ...initial,
    ...next,
    open: true,
  });
}

export function closeDialog() {
  // ✅ 关闭时如果是 confirm promise，默认 resolve false（避免悬挂）
  dialogStore.update((s) => {
    if (s?.confirm?._resolve) s.confirm._resolve(false);
    return { ...initial, open: false };
  });
}

// ✅ 语法糖：弹 Confirm Dialog，返回 Promise<boolean>
export function openConfirmDialog(opts: Omit<DialogState, 'open' | 'confirm'> & { confirm?: DialogConfirm }) {
  return new Promise<boolean>((resolve) => {
    openDialog({
      ...opts,
      confirm: {
        enabled: true,
        confirmLabelKey: 'Confirm',
        cancelLabelKey: 'Cancel',
        confirmType: 'primary',
        ...opts.confirm,
        _resolve: resolve,
      },
    });
  });
}
