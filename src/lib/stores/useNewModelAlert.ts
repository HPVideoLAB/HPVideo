import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'new_model_alert_dismissed';

/**
 * 创建新模型通知的状态管理
 */
function createNewModelAlertStore() {
	// 检查用户是否已经关闭过通知
	const isDismissed = browser ? localStorage.getItem(STORAGE_KEY) === 'true' : false;

	const { subscribe, set, update } = writable(!isDismissed);

	return {
		subscribe,
		/**
		 * 关闭通知
		 */
		dismiss: () => {
			if (browser) {
				localStorage.setItem(STORAGE_KEY, 'true');
			}
			set(false);
		},
		/**
		 * 重置通知状态（用于测试或管理员操作）
		 */
		reset: () => {
			if (browser) {
				localStorage.removeItem(STORAGE_KEY);
			}
			set(true);
		}
	};
}

export const showNewModelAlert = createNewModelAlertStore();
