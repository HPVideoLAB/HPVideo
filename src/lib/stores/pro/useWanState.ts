import { writable, derived, get } from 'svelte/store';
import { validateWanForm } from '../../../routes/pro/modules/form';
import { calculateCost } from '$lib/utils/pro/pricing';
import { toast } from 'svelte-sonner';
import { ensureWalletConnected } from '$lib/utils/wallet/check';

type Deps = {
  pay: any;
  submitTask: any;
  loadHistory: any;
  walletAddress: any;
};

export function useWanState(i18n: any, deps: Deps) {
  const { pay, submitTask, loadHistory, walletAddress } = deps;

  const form = writable({
    video: null as File | null,
    prompt: '',
    negative_prompt: '',
    strength: 0.9,
    seed: -1,
    loras: [] as any[],
    duration: 5,
    steps: 30,
    cfg: 5,
    flow: 3,
    errors: {} as any,
  });

  const cost = derived(form, ($f) => calculateCost('wan', { duration: $f.duration }));

  const validate = () => {
    const $f = get(form);
    if (!$f.video) {
      toast.warning(i18n.t('Please upload video'));
      return false;
    }

    const check = validateWanForm({
      hasVideo: !!$f.video,
      prompt: $f.prompt,
      duration: $f.duration,
      num_inference_steps: $f.steps,
      guidance_scale: $f.cfg,
      flow_shift: $f.flow,
      seed: $f.seed,
      loras: $f.loras,
    });

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
        model: 'wan-2.1',
        resolution: '720p',
        duration: $form.duration,
      });
      if (!payment.success) return;
      finalTxHash = payment.txHash;
    }

    await submitTask(
      'wan-2.1',
      {
        video: $form.video!,
        prompt: $form.prompt,
        negative_prompt: $form.negative_prompt,
        strength: $form.strength,
        seed: $form.seed,
        loras: $form.loras,
        duration: $form.duration,
        num_inference_steps: $form.steps,
        guidance_scale: $form.cfg,
        flow_shift: $form.flow,
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
