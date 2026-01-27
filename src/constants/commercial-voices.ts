export interface VoicePreset {
  id: string;
  name: string;
  description: string;
  // 为了 UI 好看，我手动加个 icon/gender 辅助字段，不影响传给后端
  gender?: 'male' | 'female' | 'robot';
}

export const ASIAN_MARKET_VOICES: VoicePreset[] = [
  // --- 爆款流量 ---
  {
    id: 'pure_desire_tea',
    name: '纯欲绿茶音',
    description: 'Soft, breathy, innocent but seductive, "Green Tea" style.',
    gender: 'female',
  },
  {
    id: 'cool_ceo',
    name: '高冷霸总音',
    description: 'Deep, low-pitched, commanding, alpha male vibe.',
    gender: 'male',
  },
  {
    id: 'funny_roast',
    name: '搞笑吐槽音',
    description: 'Fast-paced, sarcastic, energetic, meme style.',
    gender: 'male',
  },
  {
    id: 'cyber_ai',
    name: '赛博AI助手',
    description: 'Cool, emotionless, futuristic, sci-fi style.',
    gender: 'robot',
  },
  {
    id: 'husky_tomboy',
    name: '酷飒中性音',
    description: 'Husky, lower-register female voice, cool street style.',
    gender: 'female',
  },
  // --- 美女系列 ---
  {
    id: 'sweet_idol',
    name: '甜美爱豆音',
    description: 'Sweet, bright, high-pitched, K-pop idol vibe.',
    gender: 'female',
  },
  {
    id: 'elegant_queen',
    name: '知性御姐音',
    description: 'Sultry, husky, mature, luxury brand ambassador.',
    gender: 'female',
  },
  {
    id: 'healing_warm',
    name: '温柔治愈音',
    description: 'Soft, warm, maternal, cozy atmosphere.',
    gender: 'female',
  },
  {
    id: 'movie_narrator_f',
    name: '电影独白女',
    description: 'Deep, emotional, storytelling, documentary style.',
    gender: 'female',
  },
  // --- 帅哥系列 ---
  {
    id: 'magnetic_deep',
    name: '磁性低音炮',
    description: 'Deep, resonant, baritone, movie trailer style.',
    gender: 'male',
  },
  {
    id: 'fresh_youth',
    name: '清爽少年音',
    description: 'Energetic, bright, youthful, college student vibe.',
    gender: 'male',
  },
  {
    id: 'romantic_oppa',
    name: '韩剧深情男',
    description: 'Soft, emotional, K-drama romantic lead whisper.',
    gender: 'male',
  },
  {
    id: 'high_cold_prince',
    name: '清冷贵公子',
    description: 'Clean, crisp, elegant, aristocrat vibe.',
    gender: 'male',
  },
  // --- 专业场景 ---
  {
    id: 'crisp_pro',
    name: '干练职业音',
    description: 'Articulate, crisp, professional news anchor.',
    gender: 'female',
  },
  {
    id: 'high_energy_host',
    name: '激情带货王',
    description: 'Fast-paced, high-volume, livestream shopping host.',
    gender: 'male',
  },
];
