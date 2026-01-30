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
      'Soft, breathy female voice with a slightly higher pitch and slow, delicate tempo. Sounds innocent and gentle on the surface, but carries subtle flirtation and emotional manipulation underneath. Frequent light pauses, gentle sighs, and sweet intonation, creating a “green tea” personality that feels harmless, charming, and quietly seductive.',
  },
  {
    id: 'cool_ceo',
    name: '高冷霸总音 (Cold CEO)',
    description:
      'Deep, low-pitched male voice with controlled volume and slow, deliberate pacing. Emotionally restrained, confident, and authoritative. Minimal emotional fluctuation, firm sentence endings, strong presence. Feels dominant, commanding, and distant, like a powerful CEO giving calm but unquestionable orders.',
  },
  {
    id: 'funny_roast',
    name: '搞笑吐槽音 (Comedy Roast)',
    description:
      'Fast-paced and highly expressive voice with exaggerated pitch changes and sharp rhythm. Sarcastic, playful, and energetic, with comedic timing and intentional overreaction. Frequently emphasizes punchlines, mimics internet meme delivery, and feels chaotic but entertaining, perfect for humorous commentary and viral content.',
  },
  {
    id: 'cyber_ai',
    name: '赛博AI助手 (Cyberpunk AI)',
    description:
      'Cool, controlled, and emotionally neutral voice with slightly robotic tone but smooth articulation. Even pacing, precise pronunciation, and consistent volume. Futuristic and synthetic feel with subtle digital resonance, resembling a sci-fi AI assistant that sounds intelligent, efficient, and technologically advanced.',
  },
  {
    id: 'husky_tomboy',
    name: '酷飒中性音 (Cool Tomboy)',
    description:
      'Husky, low-register female voice with androgynous characteristics. Confident, relaxed, and effortless delivery. Casual pacing, slight vocal roughness, and cool street-style attitude. Feels charismatic, independent, and stylish, blending masculine confidence with feminine charm.',
  },

  // ==========================================
  // 👩 美女/女神系列 (Female Styles)
  // ==========================================
  {
    id: 'sweet_idol',
    name: '甜美爱豆音 (Sweet Idol)',
    description:
      'Bright, high-pitched youthful female voice with lively rhythm and cheerful energy. Clear pronunciation, upbeat tone, and expressive emotions. Feels cute, friendly, and full of positive idol-like enthusiasm, similar to a K-pop girl group member speaking to fans.',
  },
  {
    id: 'elegant_queen',
    name: '知性御姐音 (Elegant Lady)',
    description:
      'Mature, husky female voice with smooth, controlled pacing. Calm, confident, and sophisticated delivery. Slightly lower pitch, rich texture, and refined tone. Feels luxurious and intelligent, like a high-end brand ambassador or composed, powerful woman.',
  },
  {
    id: 'healing_warm',
    name: '温柔治愈音 (Healing Warmth)',
    description:
      'Soft, warm, and breathy female voice with slow tempo and gentle intonation. Comforting, caring, and emotionally soothing. Uses smooth transitions and light pauses, creating a safe and cozy atmosphere, similar to a reassuring companion or gentle caretaker.',
  },
  {
    id: 'movie_narrator_f',
    name: '电影独白女 (Cinematic Female)',
    description:
      'Deep, emotional female narration voice with dramatic pacing and rich expression. Slow, cinematic delivery with clear storytelling emphasis. Feels poetic, immersive, and serious, suitable for documentaries, film trailers, or artistic monologues.',
  },

  // ==========================================
  // 👨 帅哥/男神系列 (Male Styles)
  // ==========================================
  {
    id: 'magnetic_deep',
    name: '磁性低音炮 (Magnetic Deep)',
    description:
      'Deep, resonant baritone male voice with strong vocal presence and steady rhythm. Authoritative yet attractive, with trailer-style emphasis and powerful sentence endings. Feels masculine, confident, and seductive, often used for dramatic narration or premium branding.',
  },
  {
    id: 'fresh_youth',
    name: '清爽少年音 (Fresh Youth)',
    description:
      'Bright, energetic young male voice with clear articulation and medium-fast pacing. Friendly, optimistic, and approachable tone. Sounds like a cheerful college student, full of vitality and sincerity, suitable for casual, positive, and everyday scenarios.',
  },
  {
    id: 'romantic_oppa',
    name: '韩剧深情男 (Romantic Oppa)',
    description:
      'Soft, emotional male voice with slight huskiness and intimate delivery. Slower pace with gentle emphasis and warm tone. Feels sincere, affectionate, and romantic, like a K-drama male lead whispering heartfelt words.',
  },
  {
    id: 'high_cold_prince',
    name: '清冷贵公子 (Aloof Prince)',
    description:
      'Clean, refined male voice with elegant articulation and restrained emotion. Polite, calm, and slightly distant. Even pacing and gentle firmness create an aristocratic, unapproachable yet charming presence, like a noble gentleman.',
  },

  // ==========================================
  // 🎙️ 专业/商业场景 (Professional)
  // ==========================================
  {
    id: 'crisp_pro',
    name: '干练职业音 (Professional Anchor)',
    description:
      'Clear, articulate, and professional female voice with balanced pacing and neutral emotion. News-anchor style delivery that sounds trustworthy, intelligent, and composed. Emphasizes clarity and credibility, ideal for informational or corporate content.',
  },
  {
    id: 'high_energy_host',
    name: '激情带货王 (Hype Salesman)',
    description:
      'Fast-paced, high-energy male voice with strong volume and emotional intensity. Excited, persuasive, and urgent delivery. Frequently stresses key selling points, creating pressure and enthusiasm typical of livestream shopping and aggressive sales environments.',
  },
];

// 辅助生成 Menu 的字符串
export const VOICE_MENU_PROMPT = ASIAN_MARKET_VOICES.map(
  (v) => `- ID: "${v.description}" (Style: ${v.name})`,
).join('\n');
