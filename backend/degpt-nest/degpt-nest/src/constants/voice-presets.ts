export interface VoicePreset {
  id: string;
  name: string;
  description: string;
}

export const ASIAN_MARKET_VOICES: VoicePreset[] = [
  // ==========================================
  // 🔥 爆款流量特色 (Viral & Character)
  // ==========================================
  {
    id: 'pure_desire_tea',
    name: '纯欲绿茶音 (Innocent Tease)',
    description:
      'Soft, breathy, seemingly innocent but subtly seductive, higher pitch, slow tempo, "Green Tea" personality style, manipulative but sweet.',
  },
  {
    id: 'cool_ceo',
    name: '高冷霸总音 (Cold CEO)',
    description:
      'Deep, low-pitched, indifferent, commanding, emotionally detached, slow and deliberate, alpha male vibe, authoritative.',
  },
  {
    id: 'funny_roast',
    name: '搞笑吐槽音 (Comedy Roast)',
    description:
      'Fast-paced, exaggerated pitch variations, sarcastic, energetic, comedic timing, expressive and slightly goofy, internet meme style.',
  },
  {
    id: 'cyber_ai',
    name: '赛博AI助手 (Cyberpunk AI)',
    description:
      'Cool, emotionless, slightly robotic but smooth, futuristic, precise articulation, halo-like resonance, sci-fi assistant style.',
  },
  {
    id: 'husky_tomboy',
    name: '酷飒中性音 (Cool Tomboy)',
    description:
      'Husky, lower-register female voice, androgynous, confident, cool and laid-back, street style, charismatic.',
  },

  // ==========================================
  // 👩 美女/女神系列 (Female Styles)
  // ==========================================
  {
    id: 'sweet_idol',
    name: '甜美爱豆音 (Sweet Idol)',
    description:
      'Sweet, bright, high-pitched youthful female voice, K-pop idol vibe, cheerful and energetic like a girl group member.',
  },
  {
    id: 'elegant_queen',
    name: '知性御姐音 (Elegant Lady)',
    description:
      'Sultry, husky, mature female voice, sophisticated, calm and confident, luxury brand ambassador style.',
  },
  {
    id: 'healing_warm',
    name: '温柔治愈音 (Healing Warmth)',
    description:
      'Soft, breathy, warm female voice, slow-paced, comforting and maternal, creating a cozy atmosphere.',
  },
  {
    id: 'movie_narrator_f',
    name: '电影独白女 (Cinematic Female)',
    description:
      'Deep, emotional, storytelling female voice, slow and dramatic, poetic, high-end documentary narration style.',
  },

  // ==========================================
  // 👨 帅哥/男神系列 (Male Styles)
  // ==========================================
  {
    id: 'magnetic_deep',
    name: '磁性低音炮 (Magnetic Deep)',
    description:
      'Deep, resonant, baritone male voice, movie trailer narrator style, authoritative, masculine and sexy.',
  },
  {
    id: 'fresh_youth',
    name: '清爽少年音 (Fresh Youth)',
    description:
      'Energetic, bright, youthful male voice, college student vibe, friendly, sunny and optimistic, clear articulation.',
  },
  {
    id: 'romantic_oppa',
    name: '韩剧深情男 (Romantic Oppa)',
    description:
      'Soft, emotional, slightly husky male voice, K-drama romantic lead style, gentle, sincere and affectionate whisper.',
  },
  {
    id: 'high_cold_prince',
    name: '清冷贵公子 (Aloof Prince)',
    description:
      'Clean, crisp, slightly distant, elegant, polite but unapproachable, aristocrat vibe, soft but firm.',
  },

  // ==========================================
  // 🎙️ 专业/商业场景 (Professional)
  // ==========================================
  {
    id: 'crisp_pro',
    name: '干练职业音 (Professional Anchor)',
    description:
      'Articulate, crisp, professional female voice, news anchor style, trustworthy, intelligent and objective.',
  },
  {
    id: 'high_energy_host',
    name: '激情带货王 (Hype Salesman)',
    description:
      'Fast-paced, enthusiastic, high-volume male voice, livestream shopping host style, exciting, persuasive and urgent.',
  },
];

// 辅助生成 Menu 的字符串
export const VOICE_MENU_PROMPT = ASIAN_MARKET_VOICES.map(
  (v) => `- ID: "${v.description}" (Style: ${v.name})`,
).join('\n');
