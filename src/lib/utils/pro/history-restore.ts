// src/lib/utils/pro/history-restore.ts
import { toast } from 'svelte-sonner';
import { tick } from 'svelte';
import { urlToFileApi } from '$lib/apis/model/pika';
// 👇 引入 i18n store 和 get 方法
import { get } from 'svelte/store';
import i18n from '$lib/i18n';

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
    // 🔥 [新增] 1. 添加 Commercial 回调类型定义
    setCommercial: (data: any) => void;
  }
) {
  if (!params) return;

  try {
    // ================= Pika =================
    if (params.model === 'pika' || params.model.includes('pika')) {
      const savedTransitions = params.transitions ? JSON.parse(JSON.stringify(params.transitions)) : [];

      if (Array.isArray(params.images) && params.images.length > 0) {
        toast.promise(
          async () => {
            const files = await Promise.all(
              params.images.map((url: string, i: number) => urlToFileApi(url, `pika_${Date.now()}_${i}.jpg`))
            );

            callbacks.setPika({
              files,
              prompt: params.prompt || '',
              resolution: params.resolution || '720p',
              seed: params.seed ?? -1,
              transitions: [],
            });

            await tick();

            callbacks.setPika({
              transitions: savedTransitions,
            });
            await wait(100);
            return t('Pika material restored successfully');
          },
          {
            loading: t('Restoring Pika materials...'),
            success: (m) => m,
            error: t('Material download failed'),
          }
        );
      } else {
        callbacks.setPika({
          files: [],
          prompt: params.prompt || '',
          resolution: params.resolution || '720p',
          seed: params.seed ?? -1,
          transitions: savedTransitions,
        });
        toast.success(t('Pika parameters restored'));
      }

      // ================= Wan 2.1 =================
    } else if (params.model === 'commercial-pipeline' || params.model.includes('commercial')) {
      // ✅ 修正 1: 更新清洗逻辑，兼容旧数据 ('default') 并支持新数据 ('720p'/'1080p')
      const normalizeUpscale = (v: any): '720p' | '1080p' | '2k' | '4k' => {
        // 1. 如果已经是新版合法值，直接返回
        if (v === '720p' || v === '1080p' || v === '2k' || v === '4k') return v;

        // 2. 兼容旧版 string: 'default' -> 映射为标准 '1080p'
        if (v === 'default') return '1080p';

        // 3. 兼容更早的 boolean: true -> 4k, false -> 1080p
        if (v === true) return '4k';
        if (v === false) return '1080p';

        // 4. 兜底
        return '1080p';
      };

      const basicData = {
        prompt: params.prompt || '',
        voiceId: params.voice_id || params.voiceId || 'fresh_youth', // 兼容后端下划线
        duration: params.duration || 15,

        // ❌ 删除 resolution 字段 (Store 里已经删了)
        // resolution: params.resolution || '720p',

        enableSmartEnhance: params.enableSmartEnhance ?? true,

        // ✅ 使用新的清洗函数
        enableUpscale: normalizeUpscale(params.enableUpscale),
      };

      // 检查是否有参考图需要恢复
      if (params.image && typeof params.image === 'string') {
        toast.promise(
          async () => {
            // 下载图片转 File
            const file = await urlToFileApi(params.image, `commercial_${Date.now()}.jpg`);
            callbacks.setCommercial({ ...basicData, image: file });
            await tick();
            await wait(200);
            return t('Commercial material restored successfully');
          },
          {
            loading: t('Restoring reference image...'),
            success: (m) => m,
            error: t('Image download failed'),
          }
        );
      } else {
        callbacks.setCommercial({ ...basicData, image: null });
        toast.success(t('Commercial parameters restored'));
      }
    } else if (params.model === 'sam3' || params.model.includes('sam')) {
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
            return t('Sam video restored successfully');
          },
          {
            loading: t('Downloading source video...'),
            success: (m) => m,
            error: t('Video download failed'),
          }
        );
      } else {
        callbacks.setSam({ ...basicData, video: null });
        toast.success(t('Sam parameters restored'));
      }

      // ================= 🔥 [新增] 2. Commercial Logic =================
    } else if (params.model === 'commercial-pipeline' || params.model.includes('commercial')) {
      // ✅ 最小改动：把 enableUpscale 统一成 'default' | '2k' | '4k'
      const normalizeUpscale = (v: any): 'default' | '2k' | '4k' => {
        if (v === '2k' || v === '4k' || v === 'default') return v;
        // 兼容老数据 boolean：true -> 4k
        if (v === true) return '4k';
        return 'default';
      };

      const basicData = {
        prompt: params.prompt || '',
        voiceId: params.voice_id || params.voiceId || 'fresh_youth', // 兼容后端下划线命名
        duration: params.duration || 15,
        resolution: params.resolution || '720p',
        enableSmartEnhance: params.enableSmartEnhance ?? true,
        enableUpscale: normalizeUpscale(params.enableUpscale),
      };

      // 检查是否有参考图需要恢复
      if (params.image && typeof params.image === 'string') {
        toast.promise(
          async () => {
            // 下载图片转 File
            const file = await urlToFileApi(params.image, `commercial_${Date.now()}.jpg`);
            callbacks.setCommercial({ ...basicData, image: file });
            await tick();
            await wait(200);
            return t('Commercial material restored successfully');
          },
          {
            loading: t('Restoring reference image...'),
            success: (m) => m,
            error: t('Image download failed'),
          }
        );
      } else {
        callbacks.setCommercial({ ...basicData, image: null });
        toast.success(t('Commercial parameters restored'));
      }
    }
  } catch (error) {
    console.error('Restore Error:', error);
    toast.error(t('Parameter restoration system error'));
  }
}
