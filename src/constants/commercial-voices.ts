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
    name: 'Innocent & Flirty',
    description: 'Soft, breathy, innocent but seductive, "Green Tea" style.',
    gender: 'female',
  },
  {
    id: 'cool_ceo',
    name: 'Dominant CEO',
    description: 'Deep, low-pitched, commanding, alpha male vibe.',
    gender: 'male',
  },
  {
    id: 'funny_roast',
    name: 'Witty Sarcasm',
    description: 'Fast-paced, sarcastic, energetic, meme style.',
    gender: 'male',
  },
  {
    id: 'cyber_ai',
    name: 'Futuristic AI',
    description: 'Cool, emotionless, futuristic, sci-fi style.',
    gender: 'robot',
  },
  {
    id: 'husky_tomboy',
    name: 'Cool Husky',
    description: 'Husky, lower-register female voice, cool street style.',
    gender: 'female',
  },
  // --- 美女系列 ---
  {
    id: 'sweet_idol',
    name: 'Sweet Pop Idol',
    description: 'Sweet, bright, high-pitched, K-pop idol vibe.',
    gender: 'female',
  },
  {
    id: 'elegant_queen',
    name: 'Elegant Mature',
    description: 'Sultry, husky, mature, luxury brand ambassador.',
    gender: 'female',
  },
  {
    id: 'healing_warm',
    name: 'Warm & Healing',
    description: 'Soft, warm, maternal, cozy atmosphere.',
    gender: 'female',
  },
  {
    id: 'movie_narrator_f',
    name: 'Emotional Narrator',
    description: 'Deep, emotional, storytelling, documentary style.',
    gender: 'female',
  },
  // --- 帅哥系列 ---
  {
    id: 'magnetic_deep',
    name: 'Deep Magnetic',
    description: 'Deep, resonant, baritone, movie trailer style.',
    gender: 'male',
  },
  {
    id: 'fresh_youth',
    name: 'Energetic Youth',
    description: 'Energetic, bright, youthful, college student vibe.',
    gender: 'male',
  },
  {
    id: 'romantic_oppa',
    name: 'Romantic Lead',
    description: 'Soft, emotional, K-drama romantic lead whisper.',
    gender: 'male',
  },
  {
    id: 'high_cold_prince',
    name: 'Noble Aristocrat',
    description: 'Clean, crisp, elegant, aristocrat vibe.',
    gender: 'male',
  },
  // --- 专业场景 ---
  {
    id: 'crisp_pro',
    name: 'Professional Anchor',
    description: 'Articulate, crisp, professional news anchor.',
    gender: 'female',
  },
  {
    id: 'high_energy_host',
    name: 'Passionate Host',
    description: 'Fast-paced, high-volume, livestream shopping host.',
    gender: 'male',
  },
];
