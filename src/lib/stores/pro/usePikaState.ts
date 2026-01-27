import { writable, derived, get } from 'svelte/store';
import { validateImgToVideoForm, syncTransitions, totalDuration } from '../../../routes/pro/modules/form'; // 确保路径正确
import { calculateCost } from '$lib/utils/pro/pricing';
import { toast } from 'svelte-sonner';
import { ensureWalletConnected } from '$lib/utils/wallet/check';

// 定义依赖项类型
type Deps = {
  pay: any;
  submitTask: any;
  loadHistory: any;
  walletAddress: any; // 这是 store
};

export function usePikaState(i18n: any, deps: Deps) {
  const { pay, submitTask, loadHistory, walletAddress } = deps;

  // 1. 状态
  const form = writable({
    files: [] as File[],
    prompt: '',
    resolution: '720p' as '720p' | '1080p',
    seed: -1,
    transitions: [] as any[],
    errors: {} as any,
  });

  // 2. 自动同步 transitions (监听 form 变化)
  form.subscribe(($f) => {
    const newTrans = syncTransitions($f.files.length, $f.transitions);
    if (newTrans.length !== $f.transitions.length) {
      form.update((prev) => ({ ...prev, transitions: newTrans }));
    }
  });

  // 3. 计算属性
  const duration = derived(form, ($f) => Math.max(totalDuration($f.transitions), 5));

  const cost = derived([form, duration], ([$f, $d]) =>
    calculateCost('pika', { resolution: $f.resolution, duration: $d })
  );

  // 4. 校验
  const validate = () => {
    const $f = get(form);
    if ($f.files.length < 2) {
      toast.warning(i18n.t('Please upload images'));
      return false;
    }

    const check = validateImgToVideoForm({
      filesLen: $f.files.length,
      globalPrompt: $f.prompt,
      transitions: $f.transitions,
      seed: $f.seed,
    });

    if (!check.ok) {
      form.update((f) => ({ ...f, errors: check.errors }));
      return false;
    }

    form.update((f) => ({ ...f, errors: {} }));
    return true;
  };

  // 5. 重置
  const reset = (keepParams = false) => {
    if (!keepParams) {
      form.update((f) => ({ ...f, files: [], prompt: '', transitions: [] }));
    }
  };

  // 6. 🔥🔥🔥 提交逻辑 (封装在内部) 🔥🔥🔥
  const submit = async (reuseTxHash?: string, keepParams?: boolean) => {
    const address = await ensureWalletConnected();
    if (!address) return;

    if (!validate()) return; // 调用内部 validate

    let finalTxHash = reuseTxHash;
    const $form = get(form);

    // 支付
    if (!finalTxHash) {
      const payment = await pay({
        amount: get(cost),
        model: 'pika',
        resolution: $form.resolution,
        duration: get(duration),
      });
      if (!payment.success) return;
      finalTxHash = payment.txHash;
    }

    // 提交
    await submitTask(
      'pika',
      {
        files: $form.files,
        prompt: $form.prompt,
        resolution: $form.resolution,
        transitions: $form.transitions,
        seed: $form.seed,
        txHash: finalTxHash,
      },
      get(walletAddress),
      () => {
        loadHistory(get(walletAddress));
        reset(keepParams);
      }
    );
  };

  return { form, duration, cost, validate, reset, submit };
}
