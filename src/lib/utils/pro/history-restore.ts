// src/lib/utils/pro/history-restore.ts
import { toast } from 'svelte-sonner';
import { tick } from 'svelte';
import { urlToFileApi } from '$lib/apis/model/pika';
// 👇 引入 i18n store 和 get 方法
import { get } from 'svelte/store';
import i18n from '$lib/i18n'; // 请根据你项目的实际 i18n store 路径调整，通常是 '$lib/i18n' 或 '$lib/i18n/index'

// 辅助延迟
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 👇 辅助翻译函数
const t = (key: string) => get(i18n).t(key);

/**
 * 核心恢复逻辑
 * @param params 历史记录里的 params 对象
 * @param callbacks 用于更新父组件状态的回调集合
 */
export async function restoreProParams(
  params: any,
  callbacks: {
    setPika: (data: any) => void;
    setWan: (data: any) => void;
    setSam: (data: any) => void;
  }
) {
  if (!params) return;

  try {
    // ================= Pika =================
    if (params.model === 'pika') {
      const savedTransitions = params.transitions ? JSON.parse(JSON.stringify(params.transitions)) : [];

      if (Array.isArray(params.images) && params.images.length > 0) {
        toast.promise(
          async () => {
            // 并发下载图片
            const files = await Promise.all(
              params.images.map((url: string, i: number) => urlToFileApi(url, `pika_${Date.now()}_${i}.jpg`))
            );

            // 更新状态
            callbacks.setPika({
              files,
              prompt: params.prompt || '',
              resolution: params.resolution || '720p',
              seed: params.seed ?? -1,
              // 先传空转场，等组件渲染后再回填
              transitions: [],
            });

            await tick(); // 等待 UI 响应文件变化

            // 二次更新转场 (防止被 syncTransitions 覆盖)
            callbacks.setPika({
              // 这里需要合并之前的 files 等状态，或者父组件处理合并
              // 为了简单，我们让父组件传进来的 setter 支持 partial update
              transitions: savedTransitions,
            });
            await wait(100);
            return t('Pika material restored successfully'); // 👇 国际化
          },
          {
            loading: t('Restoring Pika materials...'), // 👇 国际化
            success: (m) => m,
            error: t('Material download failed'), // 👇 国际化
          }
        );
      } else {
        // 无图片情况
        callbacks.setPika({
          files: [],
          prompt: params.prompt || '',
          resolution: params.resolution || '720p',
          seed: params.seed ?? -1,
          transitions: savedTransitions,
        });
        toast.success(t('Pika parameters restored')); // 👇 国际化
      }

      // ================= Wan 2.1 =================
    } else if (params.model === 'wan-2.1') {
      const basicData = {
        prompt: params.prompt || '',
        negative_prompt: params.negative_prompt || '',
        strength: params.strength ?? 0.9,
        seed: params.seed ?? -1,
        duration: params.duration || 5,
        num_inference_steps: params.num_inference_steps || 30,
        guidance_scale: params.guidance_scale || 5,
        flow_shift: params.flow_shift || 3,
        loras: params.loras ? JSON.parse(JSON.stringify(params.loras)) : [],
      };

      if (params.video && typeof params.video === 'string') {
        toast.promise(
          async () => {
            const file = await urlToFileApi(params.video, `wan_${Date.now()}.mp4`);
            callbacks.setWan({ ...basicData, video: file });
            await tick();
            await wait(200);
            return t('Wan video restored successfully'); // 👇 国际化
          },
          {
            loading: t('Downloading source video...'), // 👇 国际化
            success: (m) => m,
            error: t('Video download failed'), // 👇 国际化
          }
        );
      } else {
        callbacks.setWan({ ...basicData, video: null });
        toast.success(t('Wan parameters restored')); // 👇 国际化
      }

      // ================= Sam 3 =================
    } else if (params.model === 'sam3') {
      const basicData = {
        prompt: params.prompt || '',
        apply_mask: params.apply_mask ?? true,
      };

      if (params.video && typeof params.video === 'string') {
        toast.promise(
          async () => {
            const file = await urlToFileApi(params.video, `sam_${Date.now()}.mp4`);
            callbacks.setSam({ ...basicData, video: file });
            await tick();
            await wait(200);
            return t('Sam video restored successfully'); // 👇 国际化
          },
          {
            loading: t('Downloading source video...'), // 👇 国际化
            success: (m) => m,
            error: t('Video download failed'), // 👇 国际化
          }
        );
      } else {
        callbacks.setSam({ ...basicData, video: null });
        toast.success(t('Sam parameters restored')); // 👇 国际化
      }
    }
  } catch (error) {
    console.error('Restore Error:', error);
    toast.error(t('Parameter restoration system error')); // 👇 国际化
  }
}
