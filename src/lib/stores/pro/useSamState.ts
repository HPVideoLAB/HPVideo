import { writable, derived, get } from 'svelte/store';
import { validateSamForm } from '../../../routes/pro/modules/form';
import { calculateCost } from '$lib/utils/pro/pricing';
import { toast } from 'svelte-sonner';
import { ensureWalletConnected } from '$lib/utils/wallet/check';

type Deps = {
  pay: any;
  submitTask: any;
  loadHistory: any;
  walletAddress: any;
};

export function useSamState(i18n: any, deps: Deps) {
  const { pay, submitTask, loadHistory, walletAddress } = deps;

  const form = writable({
    video: null as File | null,
    prompt: '',
    mask: true,
    duration: 5,
    errors: {} as any,
  });

  const cost = derived(form, ($f) => calculateCost('sam', { duration: $f.duration }));

  const validate = () => {
    const $f = get(form);
    if (!$f.video) {
      toast.warning(i18n.t('Please upload video'));
      return false;
    }

    const check = validateSamForm({ hasVideo: !!$f.video, prompt: $f.prompt });
    if (!check.ok) {
      form.update((f) => ({ ...f, errors: check.errors }));
      return false;
    }

    form.update((f) => ({ ...f, errors: {} }));
    return true;
  };

  const reset = (keepParams = false) => {
    if (!keepParams) {
      form.update((f) => ({ ...f, video: null }));
    }
  };

  // 🔥🔥🔥 提交逻辑 🔥🔥🔥
  const submit = async (reuseTxHash?: string, keepParams?: boolean) => {
    const address = await ensureWalletConnected();
    if (!address) return;

    if (!validate()) return;

    let finalTxHash = reuseTxHash;
    const $form = get(form);

    if (!finalTxHash) {
      const payment = await pay({
        amount: get(cost),
        model: 'sam3',
        resolution: 'original',
        duration: $form.duration,
      });
      if (!payment.success) return;
      finalTxHash = payment.txHash;
    }

    await submitTask(
      'sam3',
      {
        videoFile: $form.video!,
        prompt: $form.prompt,
        apply_mask: $form.mask,
        txHash: finalTxHash,
      },
      get(walletAddress),
      () => {
        loadHistory(get(walletAddress));
        reset(keepParams);
      }
    );
  };

  return { form, cost, validate, reset, submit };
}
