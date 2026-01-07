// src/constants/example-data.ts
// src/constants/example-data.ts

export type ExampleItem = {
  id: string;
  title: string;
  model: string;
  coverUrl: string;
  videoUrl: string;
  params: any;
};

export const exampleData: Record<string, ExampleItem[]> = {
  // ====================================================
  // 🟢 Pika 示例 (图生视频) - 4个
  // DTO 允许字段：model, prompt, seed, images, resolution, transitions
  // 你当前示例里额外带 video/apply_mask 为 null：这里保持一致
  // ====================================================
  'pika-v2.2-pikaframes': [
    {
      id: 'pika-1',
      title: '电影人像转场',
      model: 'pika',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/f7fe8a67-cc5a-4579-a232-2bafbc296f54.jpg',
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/59b706c7720e4b1d80104cd4188489d1/1.mp4',
      params: {
        model: 'pika',
        prompt: '电影级特写人像，柔光，浅景深，镜头轻微推进，发丝细节清晰，肤色自然，高级质感，画面稳定无抖动',
        seed: -1,
        images: [
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/f7fe8a67-cc5a-4579-a232-2bafbc296f54.jpg',
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/97ca0872-a926-41ea-87d7-028cc4f9530f.jpg',
        ],
        resolution: '720p',
        transitions: [{ duration: 5, prompt: 'smooth morph, subtle camera push-in' }],
        video: null,
        apply_mask: null,
      },
    },
    {
      id: 'pika-2',
      title: '赛博朋克霓虹雨夜',
      model: 'pika',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/bc48ba88-057c-432f-b276-cbb7e1746e27.jpg',
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/4da9d3eed38a4f6bb19173ea5df393ee/1.mp4',
      params: {
        model: 'pika',
        prompt:
          '赛博朋克城市街景，霓虹灯在湿地面反射，雨丝与薄雾，镜头平滑横移，细节丰富，灯牌文字稳定清晰，避免闪烁抖动',
        seed: 3416,
        images: [
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/bc48ba88-057c-432f-b276-cbb7e1746e27.jpg',
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/5236e733-d55b-4341-81de-70df026bf8f2.jpg',
        ],
        resolution: '1080p',
        transitions: [{ duration: 5, prompt: 'neon lights turn on, rain reflections intensify' }],
        video: null,
        apply_mask: null,
      },
    },
    {
      id: 'pika-3',
      title: '产品广告微距质感',
      model: 'pika',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/768d75c6-213d-4c3e-8dfe-b4f4329eda9b.jpg',
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/df8f4618f5b345ceb16e9fd2b8ebc334/1.mp4',
      params: {
        model: 'pika',
        prompt: '产品广告镜头，干净背景，影棚柔光，高级高光与材质细节，微距特写，镜头缓慢环绕，画面稳定无抖动',
        seed: 202401,
        images: [
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/768d75c6-213d-4c3e-8dfe-b4f4329eda9b.jpg',
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/71c8b06d-b8a8-4dc1-b729-8ea356a9ac19.jpg',
        ],
        resolution: '1080p',
        transitions: [{ duration: 5, prompt: 'slow orbit camera, keep label readable' }],
        video: null,
        apply_mask: null,
      },
    },
    {
      id: 'pika-4',
      title: '卡通3D角色动效',
      model: 'pika',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/e1772859-e0b3-4485-b7c4-fbd24f1bb448.jpg',
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/ac3c4eb522a741459230586acff598a6/1.mp4',
      params: {
        model: 'pika',
        prompt: '可爱3D卡通角色，皮克斯风格，柔和光照与高饱和色彩，角色轻微跳跃动作，镜头稳定，边缘干净无闪烁',
        seed: -1,
        images: [
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/e1772859-e0b3-4485-b7c4-fbd24f1bb448.jpg',
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/1bba35b8-20ac-46fe-8451-dff80f7a90c7.jpg',
        ],
        resolution: '720p',
        transitions: [{ duration: 5, prompt: 'character jump, subtle squash and stretch' }],
        video: null,
        apply_mask: null,
      },
    },
  ],

  // ====================================================
  // 🔵 Wan 2.1 示例 (视频风格化) - 4个
  // DTO 允许字段：model, video, prompt, negative_prompt, loras, strength,
  // num_inference_steps, duration, guidance_scale, flow_shift, seed
  // ====================================================
  'wan-2.1-v2v': [
    {
      id: 'wan-1',
      title: '电影胶片调色',
      model: 'wan-2.1',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/02d60835-ab71-459f-8d93-b0e1dd14eaa3.png',
      videoUrl:
        'https://d2p7pge43lyniu.cloudfront.net/output/cfcd952e-2176-4688-b057-f7e49055a390-u2_a4b50165-4c2a-45a2-b255-128a38dda155.mp4',
      params: {
        model: 'wan-2.1',
        video:
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/9311dc45-202b-4df2-82be-b0f7ea7401af.mp4',
        prompt:
          'Keep the original motion and timing. Apply a warm cinematic color grade, soft bloom, subtle film grain, realistic shadows. Keep faces stable and natural skin tones. Avoid flicker, warping, and jitter.',
        negative_prompt: 'flicker, jitter, warping, deformed face, extra limbs, watermark, text artifacts',
        loras: [],
        strength: 0.65,
        num_inference_steps: 30,
        duration: 5,
        guidance_scale: 6,
        flow_shift: 3,
        seed: -1,
      },
    },
    {
      id: 'wan-2',
      title: '二次元动漫化',
      model: 'wan-2.1',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/c2cca37c-cbc2-469c-bca0-9e05322f71d8.png',
      videoUrl:
        'https://d2p7pge43lyniu.cloudfront.net/output/d55097e9-0693-4ad7-a4eb-9b9ee2ca14aa-u1_83eb1b7a-0e56-46e3-a420-71f9ad913a06.mp4',
      params: {
        model: 'wan-2.1',
        video:
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/0acee190-9017-442e-bb0e-d2208cce323e.mp4',
        prompt:
          'Preserve motion and composition. Restyle into Japanese anime look with clean line art, vibrant colors, soft sky gradients, stable edges, no flicker. Keep faces stable and appealing.',
        negative_prompt: 'realistic photo, noise, flicker, unstable edges, artifacts, text, watermark',
        loras: [],
        strength: 0.8,
        num_inference_steps: 32,
        duration: 5,
        guidance_scale: 7,
        flow_shift: 3,
        seed: -1,
      },
    },
    {
      id: 'wan-3',
      title: '粘土动画风格',
      model: 'wan-2.1',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/404b7026-a407-4a3f-bfe6-918020dafc3e.png',
      videoUrl:
        'https://d2p7pge43lyniu.cloudfront.net/output/f10acecc-ea5f-44b7-b2c9-a239e06a911e-u2_0076be01-8af1-451e-9a91-de4712e27005.mp4',
      params: {
        model: 'wan-2.1',
        video:
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/f5f563bd-0086-4a17-b2db-a740bb5dbe97.mp4',
        prompt:
          'Keep the original motion and timing. Restyle into claymation stop-motion look, plasticine texture, soft studio lighting, slightly choppy handmade feel but stable composition, no flicker.',
        negative_prompt: 'flicker, jitter, warping, noisy artifacts, text, watermark',
        loras: [],
        strength: 0.85,
        num_inference_steps: 30,
        duration: 5,
        guidance_scale: 6,
        flow_shift: 4,
        seed: -1,
      },
    },
    {
      id: 'wan-4',
      title: '黑白老电影复古',
      model: 'wan-2.1',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/99050830-c420-41fe-b26d-77d74f905528.png',
      videoUrl:
        'https://d2p7pge43lyniu.cloudfront.net/output/0523df68-b228-4073-baee-7ff518b7e268-u2_4ebb44e9-aef9-48a6-bd95-171f1ace2780.mp4',
      params: {
        model: 'wan-2.1',
        video:
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/91265960-2138-4a3f-ba88-6bd8adb231e4.mp4',
        prompt:
          'Keep the same motion and timing. Convert to 1920s vintage silent film: black and white, soft contrast, subtle grain, occasional light scratches, stable composition, no flicker.',
        negative_prompt: 'color, modern look, heavy flicker, warping, face distortion, text, watermark',
        loras: [],
        strength: 0.7,
        num_inference_steps: 28,
        duration: 5,
        guidance_scale: 6,
        flow_shift: 4,
        seed: -1,
      },
    },
  ],

  // ====================================================
  // 🟣 SAM 3 示例 (智能抠图/分割) - 4个
  // DTO 允许字段：model, video, prompt, apply_mask
  // 你当前示例里带 seed:null：这里保持一致
  // ====================================================
  'sam3-video': [
    {
      id: 'sam-1',
      title: '人物智能分割',
      model: 'sam3',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/5dc55255-ea62-4455-8fcc-c6a685790bf1.png',
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/896e4973091747b8985a7eed122657c1/1.mp4',
      params: {
        model: 'sam3',
        prompt: 'the woman',
        seed: null,
        video:
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/d886fed9-7c32-4168-aba1-eb43fb83ebf6.mp4',
        apply_mask: true,
      },
    },
    {
      id: 'sam-2',
      title: '汽车主体抠图',
      model: 'sam3',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/b62dd559-fb11-4e6f-9985-1ffe33bef460.png',
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/a8873f79cd1d4fdbb965825f25afccc5/1.mp4',
      params: {
        model: 'sam3',
        prompt: 'the car',
        seed: null,
        video:
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/b1174bb4-1ce0-450d-b83f-bd5fa8853f2d.mp4',
        apply_mask: true,
      },
    },
    {
      id: 'sam-3',
      title: '宠物动态识别',
      model: 'sam3',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/d6199a07-fd39-49b1-9f8e-237df92da44a.png',
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/799b3effcbe241c6a96af98042e0e4d7/1.mp4',
      params: {
        model: 'sam3',
        prompt: 'cat,butterfly',
        seed: null,
        video:
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/d6f3d2de-23aa-4184-bc6f-2ec0ad67eb5a.mp4',
        apply_mask: true,
      },
    },
    {
      id: 'sam-4',
      title: '电商高跟鞋产品抠图',
      model: 'sam3',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/093a9726-a807-4d6e-a7fe-6b99106dfc71.png',
      videoUrl: 'https://d1q70pf5vjeyhc.cloudfront.net/predictions/4b64de75a49547a28ac9040cc5e6e8df/1.mp4',
      params: {
        model: 'sam3',
        prompt: 'High heels, lipstick',
        seed: null,
        video:
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/73fb6db8-df3c-48c0-8864-f7058991b060.mp4',
        apply_mask: true,
      },
    },
  ],
};
