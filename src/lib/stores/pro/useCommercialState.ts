import { writable, derived, get } from 'svelte/store';
import { calculateCost } from '$lib/utils/pro/pricing';
import { toast } from 'svelte-sonner';
import { ensureWalletConnected } from '$lib/utils/wallet/check';

type Deps = {
  pay: any;
  submitTask: any;
  loadHistory: any;
  walletAddress: any;
};

export function useCommercialState(i18n: any, deps: Deps) {
  const { pay, submitTask, loadHistory, walletAddress } = deps;
  // 🔥 关键修改：获取 i18n Store 的实际值
  // 如果 i18n 是一个包含 t 函数的对象 store
  const t = get(i18n).t;
  // 1. 表单状态
  const form = writable({
    image: null as File | null,
    prompt: '',
    voiceId: 'fresh_youth', // 默认音色
    duration: 15, // 默认时长
    resolution: '720p' as '720p' | '1080p',
    enableSmartEnhance: true, // 默认开启 AI 导演
    enableUpscale: 'default' as 'default' | '2k' | '4k',
    errors: {} as any,
  });

  // 2. 计费逻辑 (固定 0.01)
  const cost = derived(form, ($f) => calculateCost('commercial-pipeline', {}));

  // 3. 校验逻辑
  const validate = () => {
    const $f = get(form);
    const errors: any = {};
    let isValid = true; // 引入一个标记位

    // 1. 校验图片 (记录错误或 Toast，但不要立刻 return)
    if (!$f.image) {
      toast.warning(t('Please upload a reference image'));
      isValid = false; // 标记为无效
      // 如果你想让图片上传区域也变红，可以在这里加 errors.image = '...'
    }

    // 2. 校验提示词 (关键修复：现在这行代码一定会执行了)
    // 注意：这里必须用 globalPrompt 作为 key，因为你的组件里读的是 errors.globalPrompt
    if (!$f.prompt || $f.prompt.trim().length < 2) {
      errors.globalPrompt = t('Please describe the product or scene');
      isValid = false;
    }

    // 3. 统一更新错误状态
    // 即使 isValid 为 false，我们也需要把 errors 更新到 store 里，这样 UI 才会变红
    if (Object.keys(errors).length > 0) {
      form.update((f) => ({ ...f, errors }));
    } else {
      // 如果没有错误，清空之前的错误
      form.update((f) => ({ ...f, errors: {} }));
    }

    return isValid;
  };

  // 4. 重置
  const reset = (keepParams = false) => {
    if (!keepParams) {
      form.update((f) => ({
        ...f,
        image: null,
        prompt: '',
        // 保留一些偏好设置，比如音色和开关，通常用户希望保留
      }));
    }
  };

  // 5. 提交逻辑
  const submit = async (reuseTxHash?: string, keepParams?: boolean) => {
    const address = await ensureWalletConnected();
    if (!address) return;

    if (!validate()) return;

    let finalTxHash = reuseTxHash;
    const $form = get(form);

    // 支付
    if (!finalTxHash) {
      const payment = await pay({
        amount: get(cost),
        model: 'commercial-pipeline',
        resolution: $form.enableUpscale ? '4k' : $form.resolution,
        duration: $form.duration,
      });
      if (!payment.success) return;
      finalTxHash = payment.txHash;
    }

    // 提交任务
    await submitTask(
      'commercial', // 对应 strategy key
      {
        imageFile: $form.image,
        prompt: $form.prompt,
        voiceId: $form.voiceId,
        duration: $form.duration,
        resolution: '1080p',
        enableSmartEnhance: $form.enableSmartEnhance,
        enableUpscale: $form.enableUpscale,
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
