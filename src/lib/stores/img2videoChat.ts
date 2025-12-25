import { writable } from 'svelte/store';

export type ChatHistory = { messages: Record<string, any>; currentId: string | null };

export const img2videoState = writable<{
  chatId: string;
  title: string;
  history: ChatHistory;
}>({
  chatId: '',
  title: '',
  history: { messages: {}, currentId: null },
});
