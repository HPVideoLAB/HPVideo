// src/lib/utils/pro/history-restore.ts
import { toast } from 'svelte-sonner';
import { tick } from 'svelte';
import { urlToFileApi } from '$lib/apis/model/pika';

// 辅助延迟
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
            return 'Pika 素材恢复成功';
          },
          { loading: '正在恢复 Pika 素材...', success: (m) => m, error: '素材下载失败' }
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
        toast.success('Pika 参数已恢复');
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
            return 'Wan 视频恢复成功';
          },
          { loading: '正在下载源视频...', success: (m) => m, error: '视频下载失败' }
        );
      } else {
        callbacks.setWan({ ...basicData, video: null });
        toast.success('Wan 参数已恢复');
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
            return 'Sam 视频恢复成功';
          },
          { loading: '正在下载源视频...', success: (m) => m, error: '视频下载失败' }
        );
      } else {
        callbacks.setSam({ ...basicData, video: null });
        toast.success('Sam 参数已恢复');
      }
    }
  } catch (error) {
    console.error('Restore Error:', error);
    toast.error('参数恢复系统错误');
  }
}
