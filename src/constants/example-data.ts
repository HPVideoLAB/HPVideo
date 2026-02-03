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
      title: 'Cinematic Portrait Transition',
      model: 'pika',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/f7fe8a67-cc5a-4579-a232-2bafbc296f54.jpg',
      videoUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/0d22fb49-50f6-4a8d-a3fa-878fe0cac75c.mp4',
      params: {
        model: 'pika',
        prompt:
          'Cinematic close-up portrait, soft lighting, shallow depth of field, subtle camera push-in, clear hair details, natural skin tone, premium texture, stable footage without jitter',
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
      title: 'Cyberpunk Neon Rainy Night',
      model: 'pika',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/bc48ba88-057c-432f-b276-cbb7e1746e27.jpg',
      videoUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/831161b6-e057-4259-a066-6d5465a16063.mp4',
      params: {
        model: 'pika',
        prompt:
          'Cyberpunk city street view, neon lights reflecting on wet ground, rain and mist, smooth camera pan, rich details, stable and clear neon sign text, avoid flickering',
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
      title: 'Product Commercial Macro',
      model: 'pika',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/768d75c6-213d-4c3e-8dfe-b4f4329eda9b.jpg',
      videoUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/4cb044b5-a511-48ac-9ee3-3bf6b285038d.mp4',
      params: {
        model: 'pika',
        prompt:
          'Product commercial shot, clean background, soft studio lighting, high-quality highlights and material details, macro close-up, slow camera orbit, stable footage without jitter',
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
      title: '3D Cartoon Character Motion',
      model: 'pika',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/e1772859-e0b3-4485-b7c4-fbd24f1bb448.jpg',
      videoUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/68a7d610-5ab5-4276-a327-bd61e67fb21d.mp4',
      params: {
        model: 'pika',
        prompt:
          'Cute 3D cartoon character, Pixar style, soft lighting and high saturation colors, slight jumping action, stable camera, clean edges without flickering',
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
      title: 'Cinematic Film Grading',
      model: 'wan-2.1',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/02d60835-ab71-459f-8d93-b0e1dd14eaa3.png',
      videoUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/324b3fed-8cb9-43a3-8192-f6fc1bec87cf.mp4',
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
      title: 'Anime Style Transformation',
      model: 'wan-2.1',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/c2cca37c-cbc2-469c-bca0-9e05322f71d8.png',
      videoUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/81137e80-bf02-4dce-9d31-767617c82001.mp4',
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
    // {
    //   id: 'wan-3',
    //   title: 'Claymation Style',
    //   model: 'wan-2.1',
    //   coverUrl:
    //     'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/404b7026-a407-4a3f-bfe6-918020dafc3e.png',
    //   videoUrl:
    //     'https://d2p7pge43lyniu.cloudfront.net/output/f10acecc-ea5f-44b7-b2c9-a239e06a911e-u2_0076be01-8af1-451e-9a91-de4712e27005.mp4',
    //   params: {
    //     model: 'wan-2.1',
    //     video:
    //       'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/f5f563bd-0086-4a17-b2db-a740bb5dbe97.mp4',
    //     prompt:
    //       'Keep the original motion and timing. Restyle into claymation stop-motion look, plasticine texture, soft studio lighting, slightly choppy handmade feel but stable composition, no flicker.',
    //     negative_prompt: 'flicker, jitter, warping, noisy artifacts, text, watermark',
    //     loras: [],
    //     strength: 0.85,
    //     num_inference_steps: 30,
    //     duration: 5,
    //     guidance_scale: 6,
    //     flow_shift: 4,
    //     seed: -1,
    //   },
    // },
    // {
    //   id: 'wan-4',
    //   title: 'Vintage Black & White Film',
    //   model: 'wan-2.1',
    //   coverUrl:
    //     'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/99050830-c420-41fe-b26d-77d74f905528.png',
    //   videoUrl:
    //     'https://d2p7pge43lyniu.cloudfront.net/output/0523df68-b228-4073-baee-7ff518b7e268-u2_4ebb44e9-aef9-48a6-bd95-171f1ace2780.mp4',
    //   params: {
    //     model: 'wan-2.1',
    //     video:
    //       'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/91265960-2138-4a3f-ba88-6bd8adb231e4.mp4',
    //     prompt:
    //       'Keep the same motion and timing. Convert to 1920s vintage silent film: black and white, soft contrast, subtle grain, occasional light scratches, stable composition, no flicker.',
    //     negative_prompt: 'color, modern look, heavy flicker, warping, face distortion, text, watermark',
    //     loras: [],
    //     strength: 0.7,
    //     num_inference_steps: 28,
    //     duration: 5,
    //     guidance_scale: 6,
    //     flow_shift: 4,
    //     seed: -1,
    //   },
    // },
  ],

  // ====================================================
  // 🟣 SAM 3 示例 (智能抠图/分割) - 4个
  // DTO 允许字段：model, video, prompt, apply_mask
  // 你当前示例里带 seed:null：这里保持一致
  // ====================================================
  'sam3-video': [
    {
      id: 'sam-1',
      title: 'Smart Person Segmentation',
      model: 'sam3',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/5dc55255-ea62-4455-8fcc-c6a685790bf1.png',
      videoUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/5dc194b8-dc40-40a3-a0e3-3dc63409be53.mp4',
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
      title: 'Car Subject Matting',
      model: 'sam3',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/b62dd559-fb11-4e6f-9985-1ffe33bef460.png',
      videoUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/61b5fac2-3d6f-4a0e-a7b4-8f4735b1bfcb.mp4',
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
      title: 'Pet Motion Recognition',
      model: 'sam3',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/d6199a07-fd39-49b1-9f8e-237df92da44a.png',
      videoUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/3328d0c1-2664-4d05-ade4-8a71bcd3ed1e.mp4',
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
      title: 'E-commerce High Heels Matting',
      model: 'sam3',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/01/07/093a9726-a807-4d6e-a7fe-6b99106dfc71.png',
      videoUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/9ba215df-b178-4cea-830b-2cf1ea42a14a.mp4',
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
  // ====================================================
  // 🔥🔥🔥 [新增] Commercial Pipeline 示例 🔥🔥🔥
  // ====================================================
  'commercial-pipeline': [
    {
      id: 'comm-1',
      title: 'Artisan Brew: Cinematic Coffee Showcase',
      model: 'commercial-pipeline',
      // 这里我放了占位图片/视频链接，你可以换成你自己生成的真实案例链接
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/a261ec7b-8533-4838-a015-cb96615f86de.png',
      videoUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/0cba5084-a409-4e9a-8482-6bfd3cd9a523.mp4',
      params: {
        model: 'commercial-pipeline',
        image:
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/a261ec7b-8533-4838-a015-cb96615f86de.png',
        prompt: '这个杯子的宣传视频',
        voiceId: 'fresh_youth',
        duration: 15,
        resolution: '1080p',
        enableSmartEnhance: true,
        enableUpscale: false,
      },
    },
    {
      id: 'comm-2',
      title: 'Midnight Aura: High-End Fragrance Aesthetics',
      model: 'commercial-pipeline',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/b25ad2c8-920e-4b53-b65a-9c0958761c80.jpg',
      videoUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/8aa679ed-7aec-4711-8014-e889715af162.mp4',
      params: {
        model: 'commercial-pipeline',
        image:
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/b25ad2c8-920e-4b53-b65a-9c0958761c80.jpg',
        prompt: 'Elegant perfume bottle rotation, soft luxury lighting, macro details.',
        voiceId: 'elegant_queen',
        duration: 15,
        resolution: '1080p',
        enableSmartEnhance: true,
        enableUpscale: true,
      },
    },
    {
      id: 'comm-3',
      title: 'Vanguard Gear: Next-Gen Smartwatch Interaction',
      model: 'commercial-pipeline',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/3d348df6-1f4a-4cf4-b892-4912eef72672.jpg',
      videoUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/69a96d4c-17a9-46ee-b720-ec731c86bc0c.mp4',
      params: {
        model: 'commercial-pipeline',
        image:
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/3d348df6-1f4a-4cf4-b892-4912eef72672.jpg',
        prompt: '이 스마트워치 홍보 영상에는 인물이 출연하고 대사가 있어야 합니다.',
        voiceId: 'cyber_ai',
        duration: 15,
        resolution: '1080p',
        enableSmartEnhance: true,
        enableUpscale: false,
      },
    },

    {
      id: 'comm-4',
      title: 'Iconic Glow: Social-First Beauty Campaign',
      model: 'commercial-pipeline',
      coverUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/23d4340a-dc63-4072-889a-a39fe4bff85e.jpg',
      videoUrl:
        'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/3e284143-81c7-47b4-9440-dcf85573742e.mp4',
      params: {
        model: 'commercial-pipeline',
        image:
          'https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/03/23d4340a-dc63-4072-889a-a39fe4bff85e.jpg',
        prompt: `（把镜头凑到脸旁）
“家人们谁懂啊！这支口红的质地也太绝了！”
（突然对着镜头亲了一口纸巾）
“看到没？不掉色！喝水不沾杯，吃火锅也不怕——”
（突然变严肃，压低声音）
“但接吻会掉啊！不过没关系，反正……”
（秒变笑脸，举高产品）
“咱们主打一个：只让男人破产，不让他得逞！”
（眨眼）下单链接3号！`,
        voiceId: 'cyber_ai',
        duration: 15,
        resolution: '1080p',
        enableSmartEnhance: true,
        enableUpscale: false,
      },
    },
  ],
};
