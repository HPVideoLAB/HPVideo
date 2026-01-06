// src/constants/example-data.ts

// 定义简单的类型以便后续维护（可选）
export type ExampleItem = {
  id: string;
  title: string;
  model: string;
  coverUrl: string;
  videoUrl: string;
  params: any; // 对应你的 DTO 结构
};
// {
//   "count": 2,
//   "urls": [
//       "https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/06/19d59156-0e1c-4c53-acd4-01492a936b74.jpg",
//       "https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/06/f095c8c0-881f-4b2b-981e-0af8c11b6aa0.png"
//   ]
// }
// 使用对象结构，key 对应你的 model 值
export const exampleData: Record<string, ExampleItem[]> = {
  // ====================================================
  // 🟢 Pika 示例 (图生视频) - 4个
  // ====================================================
  'pika-v2.2-pikaframes': [
    {
      id: 'pika-1',
      title: '美女转场特效',
      model: 'pika',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/06/f095c8c0-881f-4b2b-981e-0af8c11b6aa0.png',
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/996d89e1f88e45459426dfa3137525d6/1.mp4',
      params: {
        model: 'pika',
        prompt: '美女, 头发飘逸, 柔光',
        seed: -1,
        images: [
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/06/f095c8c0-881f-4b2b-981e-0af8c11b6aa0.png',
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/05/74e68fef-70e5-4e32-a218-6358af288a2b.png',
        ],
        resolution: '720p',
        transitions: [{ duration: 5, prompt: 'morph' }],
        video: null,
        apply_mask: null,
      },
    },
    {
      id: 'pika-2',
      title: '赛博朋克城市',
      model: 'pika',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/06/f095c8c0-881f-4b2b-981e-0af8c11b6aa0.png', // 待替换
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/996d89e1f88e45459426dfa3137525d6/1.mp4', // 待替换
      params: {
        model: 'pika',
        prompt: 'Cyberpunk city, neon lights, raining',
        seed: 1234,
        images: ['YOUR_IMAGE_URL_A', 'YOUR_IMAGE_URL_B'], // 待替换
        resolution: '1080p',
        transitions: [{ duration: 5, prompt: 'lights on' }],
      },
    },
    {
      id: 'pika-3',
      title: '油画风格变换',
      model: 'pika',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/06/f095c8c0-881f-4b2b-981e-0af8c11b6aa0.png', // 待替换
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/996d89e1f88e45459426dfa3137525d6/1.mp4', // 待替换
      params: {
        model: 'pika',
        prompt: 'Oil painting style, van gogh, swirling clouds',
        seed: -1,
        images: ['YOUR_IMAGE_URL_C', 'YOUR_IMAGE_URL_D'], // 待替换
        resolution: '720p',
        transitions: [{ duration: 5, prompt: 'paint stroke' }],
      },
    },
    {
      id: 'pika-4',
      title: '卡通角色生成',
      model: 'pika',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/06/f095c8c0-881f-4b2b-981e-0af8c11b6aa0.png', // 待替换
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/996d89e1f88e45459426dfa3137525d6/1.mp4', // 待替换
      params: {
        model: 'pika',
        prompt: 'Cute 3D character animation, pixar style',
        seed: -1,
        images: ['YOUR_IMAGE_URL_E', 'YOUR_IMAGE_URL_F'], // 待替换
        resolution: '720p',
        transitions: [{ duration: 5, prompt: 'jump' }],
      },
    },
  ],

  // ====================================================
  // 🔵 Wan 2.1 示例 (视频风格化) - 4个
  // ====================================================
  'wan-2.1-v2v': [
    {
      id: 'wan-1',
      title: '美女风格重绘',
      model: 'wan-2.1',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/06/f095c8c0-881f-4b2b-981e-0af8c11b6aa0.png',
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/996d89e1f88e45459426dfa3137525d6/1.mp4',
      params: {
        model: 'wan-2.1',
        prompt: '美女, 胶片质感, 唯美',
        seed: -1,
        video:
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/06/86c303ea-514c-4849-8da6-e8a32bfa70c0.mp4',
        negative_prompt: '',
        strength: 0.9,
        num_inference_steps: 30,
        duration: 5,
        guidance_scale: 5,
        flow_shift: 3,
        loras: [],
      },
    },
    {
      id: 'wan-2',
      title: '二次元动漫化',
      model: 'wan-2.1',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/06/f095c8c0-881f-4b2b-981e-0af8c11b6aa0.png',
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/996d89e1f88e45459426dfa3137525d6/1.mp4',
      params: {
        model: 'wan-2.1',
        prompt: 'Japanese anime style, makoto shinkai, vibrant colors',
        seed: -1,
        video: 'YOUR_VIDEO_URL', // 待替换
        negative_prompt: 'realistic, photo',
        strength: 0.8,
        num_inference_steps: 30,
        duration: 5,
      },
    },
    {
      id: 'wan-3',
      title: '粘土动画风',
      model: 'wan-2.1',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/06/f095c8c0-881f-4b2b-981e-0af8c11b6aa0.png',
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/996d89e1f88e45459426dfa3137525d6/1.mp4',
      params: {
        model: 'wan-2.1',
        prompt: 'Claymation style, stop motion, plasticine texture',
        seed: -1,
        video: 'YOUR_VIDEO_URL', // 待替换
        strength: 0.85,
        num_inference_steps: 30,
        duration: 5,
      },
    },
    {
      id: 'wan-4',
      title: '黑白老电影',
      model: 'wan-2.1',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/06/f095c8c0-881f-4b2b-981e-0af8c11b6aa0.png',
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/996d89e1f88e45459426dfa3137525d6/1.mp4',
      params: {
        model: 'wan-2.1',
        prompt: 'Vintage film, black and white, noisy, 1920s style',
        seed: -1,
        video: 'YOUR_VIDEO_URL', // 待替换
        strength: 0.7,
        num_inference_steps: 30,
        duration: 5,
      },
    },
  ],

  // ====================================================
  // 🟣 SAM 3 示例 (智能抠图) - 4个
  // ====================================================
  'sam3-video': [
    {
      id: 'sam-1',
      title: '人物智能分割',
      model: 'sam3',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/06/f095c8c0-881f-4b2b-981e-0af8c11b6aa0.png',
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/996d89e1f88e45459426dfa3137525d6/1.mp4',
      params: {
        model: 'sam3',
        prompt: 'the woman',
        seed: null,
        video:
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/06/2bfa0252-35cb-4fd2-b76f-1cdc43f2dfd1.mp4',
        apply_mask: true,
      },
    },
    {
      id: 'sam-2',
      title: '汽车主体抠图',
      model: 'sam3',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/06/f095c8c0-881f-4b2b-981e-0af8c11b6aa0.png',
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/996d89e1f88e45459426dfa3137525d6/1.mp4',
      params: {
        model: 'sam3',
        prompt: 'the red car',
        seed: null,
        video: 'YOUR_VIDEO_URL',
        apply_mask: true,
      },
    },
    {
      id: 'sam-3',
      title: '宠物动态识别',
      model: 'sam3',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/06/f095c8c0-881f-4b2b-981e-0af8c11b6aa0.png',
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/996d89e1f88e45459426dfa3137525d6/1.mp4',
      params: {
        model: 'sam3',
        prompt: 'the running dog',
        seed: null,
        video: 'YOUR_VIDEO_URL',
        apply_mask: true,
      },
    },
    {
      id: 'sam-4',
      title: '背景分离提取',
      model: 'sam3',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/06/f095c8c0-881f-4b2b-981e-0af8c11b6aa0.png',
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/996d89e1f88e45459426dfa3137525d6/1.mp4',
      params: {
        model: 'sam3',
        prompt: 'the background',
        seed: null,
        video: 'YOUR_VIDEO_URL',
        apply_mask: false,
      },
    },
  ],
};
