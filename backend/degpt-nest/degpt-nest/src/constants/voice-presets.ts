// src/constants/voice-presets.ts

export interface VoicePreset {
  id: string;
  name: string;
  description: {
    en: string;
    zh: string; // 简体中文
    ko: string; // 韩语
  };
}

export const ASIAN_MARKET_VOICES: VoicePreset[] = [
  // ==========================================
  // 🔥 爆款流量特色 (Viral & Character)
  // ==========================================
  {
    id: 'pure_desire_tea',
    name: 'Innocent Tease',
    description: {
      en: 'Soft, breathy female voice with a slightly higher pitch and slow, delicate tempo. Sounds innocent and gentle on the surface, but carries subtle flirtation and emotional manipulation underneath. Frequent light pauses, gentle sighs, and sweet intonation, creating a "green tea" personality that feels harmless, charming, and quietly seductive.',
      zh: '软糯、气声明显的年轻女性声音，语调微高，节奏缓慢而细腻。表面听起来无辜温柔，但暗含撩拨和情感操控感。带有轻微的停顿、叹息和甜美的语调，典型的“纯欲绿茶”风格，给人一种人畜无害却充满诱惑的感觉。',
      ko: '부드럽고 숨소리가 섞인 여성 목소리, 약간 높은 톤과 느리고 섬세한 템포. 겉으로는 순수하고 상냥하게 들리지만, 은근한 유혹과 감정적인 밀당이 느껴짐. 잦은 가벼운 멈춤, 부드러운 한숨, 달콤한 억양이 특징이며, 해로워 보이지 않으면서도 매력적이고 조용히 유혹하는 "여우" 같은 성격.',
    },
  },
  {
    id: 'cool_ceo',
    name: 'Cold CEO',
    description: {
      en: 'Deep, low-pitched male voice with controlled volume and slow, deliberate pacing. Emotionally restrained, confident, and authoritative. Minimal emotional fluctuation, firm sentence endings, strong presence. Feels dominant, commanding, and distant, like a powerful CEO giving calm but unquestionable orders.',
      zh: '低沉深厚的男性声音，音量控制极佳，语速缓慢而从容。情感克制，充满自信和权威感。情绪波动极小，句尾坚定有力，气场强大。给人一种高冷、掌控一切的“霸道总裁”感，仿佛在下达冷静但不可质疑的命令。',
      ko: '깊고 낮은 톤의 남성 목소리, 절제된 볼륨과 느리고 신중한 속도. 감정을 억제하고 자신감 넘치며 권위적임. 감정 기복이 적고 문장 끝이 단호하며 존재감이 강함. 차가운 도시 남자나 강력한 CEO가 차분하지만 거역할 수 없는 명령을 내리는 듯한 지배적인 느낌.',
    },
  },
  {
    id: 'funny_roast',
    name: 'Comedy Roast',
    description: {
      en: 'Fast-paced and highly expressive voice with exaggerated pitch changes and sharp rhythm. Sarcastic, playful, and energetic, with comedic timing and intentional overreaction. Frequently emphasizes punchlines, mimics internet meme delivery, and feels chaotic but entertaining, perfect for humorous commentary and viral content.',
      zh: '语速快且表现力极强，音调变化夸张，节奏犀利。充满讽刺、戏谑和活力，带有喜剧节奏感和刻意的过度反应。经常重读笑点，模仿网络热梗的说话方式，给人一种喧闹但有趣的“搞笑吐槽博主”的感觉，非常适合病毒式传播的内容。',
      ko: '빠르고 표현력이 풍부한 목소리, 과장된 톤 변화와 날카로운 리듬. 비꼬는 듯하면서도 장난스럽고 에너지가 넘치며, 코믹한 타이밍과 의도적인 과장된 반응이 특징. 펀치라인을 자주 강조하고 인터넷 밈 말투를 모방하며, 정신없지만 재미있는 느낌으로 유머 해설이나 바이럴 콘텐츠에 적합함.',
    },
  },
  {
    id: 'cyber_ai',
    name: 'Cyberpunk AI',
    description: {
      en: 'Cool, controlled, and emotionally neutral voice with slightly robotic tone but smooth articulation. Even pacing, precise pronunciation, and consistent volume. Futuristic and synthetic feel with subtle digital resonance, resembling a sci-fi AI assistant that sounds intelligent, efficient, and technologically advanced.',
      zh: '冷静、克制且情感中立的声音，带有轻微的机械感但发音流畅。语速均匀，咬字精准，音量恒定。具有未来感和合成感，带有微妙的数字共鸣，像是一个不仅智能高效，而且科技感十足的科幻 AI 助手。',
      ko: '차갑고 절제된 감정의 중립적인 목소리, 약간의 로봇 톤이지만 발음은 매끄러움. 일정한 속도, 정확한 발음, 일관된 볼륨. 미묘한 디지털 공명이 느껴지는 미래지향적이고 합성된 느낌으로, 지능적이고 효율적이며 기술적으로 진보된 SF 영화 속 AI 비서와 같음.',
    },
  },
  {
    id: 'husky_tomboy',
    name: 'Cool Tomboy',
    description: {
      en: 'Husky, low-register female voice with androgynous characteristics. Confident, relaxed, and effortless delivery. Casual pacing, slight vocal roughness, and cool street-style attitude. Feels charismatic, independent, and stylish, blending masculine confidence with feminine charm.',
      zh: '沙哑低沉的女性声音，带有中性特质。自信、松弛且毫不费力。语速随意，声线略带颗粒感，充满街头酷飒的态度。既有男性的潇洒自信，又有女性的魅力，给人一种充满魅力的“酷女孩/Tomboy”的感觉。',
      ko: '허스키하고 낮은 음역대의 여성 목소리, 중성적인 특징이 있음. 자신감 있고 여유로우며 힘을 뺀 말투. 편안한 속도, 약간의 거친 질감, 쿨한 스트릿 스타일의 태도. 카리스마 있고 독립적이며 스타일리시한 느낌으로, 남성적인 자신감과 여성적인 매력이 조화를 이룸.',
    },
  },

  // ==========================================
  // 👩 美女/女神系列 (Female Styles)
  // ==========================================
  {
    id: 'sweet_idol',
    name: 'Sweet Idol',
    description: {
      en: 'Bright, high-pitched youthful female voice with lively rhythm and cheerful energy. Clear pronunciation, upbeat tone, and expressive emotions. Feels cute, friendly, and full of positive idol-like enthusiasm, similar to a K-pop girl group member speaking to fans.',
      zh: '明亮高亢的年轻女性声音，节奏活泼，充满快乐能量。咬字清晰，语调上扬，情感丰富。给人可爱、亲切且充满正能量的感觉，就像 K-pop 女团成员在对粉丝说话一样，元气满满。',
      ko: '밝고 높은 톤의 젊은 여성 목소리, 생동감 넘치는 리듬과 명랑한 에너지. 정확한 발음, 업비트 톤, 풍부한 감정 표현. 귀엽고 친근하며 아이돌 같은 긍정적인 열정이 가득하여, K-pop 걸그룹 멤버가 팬들에게 말하는 듯한 느낌.',
    },
  },
  {
    id: 'elegant_queen',
    name: 'Elegant Lady',
    description: {
      en: 'Mature, husky female voice with smooth, controlled pacing. Calm, confident, and sophisticated delivery. Slightly lower pitch, rich texture, and refined tone. Feels luxurious and intelligent, like a high-end brand ambassador or composed, powerful woman.',
      zh: '成熟沙哑的女性声音，语速平稳受控。冷静、自信且精致。音调略低，质感丰富，语气优雅。给人一种奢华、知性的感觉，像是一位高端品牌代言人或从容干练的“大女主”。',
      ko: '성숙하고 허스키한 여성 목소리, 매끄럽고 절제된 속도. 차분하고 자신감 있으며 세련된 말투. 약간 낮은 톤, 풍부한 질감, 정제된 어조. 고급스럽고 지적인 느낌으로, 하이엔드 브랜드 앰배서더나 침착하고 강인한 여성 리더 같음.',
    },
  },
  {
    id: 'healing_warm',
    name: 'Healing Warmth',
    description: {
      en: 'Soft, warm, and breathy female voice with slow tempo and gentle intonation. Comforting, caring, and emotionally soothing. Uses smooth transitions and light pauses, creating a safe and cozy atmosphere, similar to a reassuring companion or gentle caretaker.',
      zh: '柔和、温暖且带有气声的女性声音，语速缓慢，语调温柔。充满安慰、关怀和情感治愈力。转换顺滑，停顿轻柔，营造出一种安全舒适的氛围，像是一位让人安心的伴侣或温柔的守护者。',
      ko: '부드럽고 따뜻하며 숨소리가 섞인 여성 목소리, 느린 템포와 온화한 억양. 편안하고 배려심 깊으며 정서적으로 치유되는 느낌. 매끄러운 연결과 가벼운 멈춤을 사용하여 안전하고 아늑한 분위기를 조성하며, 안심이 되는 동반자나 상냥한 보호자 같음.',
    },
  },
  {
    id: 'movie_narrator_f',
    name: 'Cinematic Female',
    description: {
      en: 'Deep, emotional female narration voice with dramatic pacing and rich expression. Slow, cinematic delivery with clear storytelling emphasis. Feels poetic, immersive, and serious, suitable for documentaries, film trailers, or artistic monologues.',
      zh: '深情且富有情感的女性旁白音，节奏具有戏剧性，表现力丰富。缓慢的电影级叙述风格，强调故事感。给人一种诗意、沉浸和严肃的感觉，非常适合纪录片、电影预告片或艺术独白。',
      ko: '깊고 감성적인 여성 내레이션 목소리, 드라마틱한 속도와 풍부한 표현력. 느리고 영화 같은 전달력으로 스토리텔링을 강조함. 시적이고 몰입감 있으며 진지한 느낌으로, 다큐멘터리, 영화 예고편 또는 예술적 독백에 적합함.',
    },
  },

  // ==========================================
  // 👨 帅哥/男神系列 (Male Styles)
  // ==========================================
  {
    id: 'magnetic_deep',
    name: 'Magnetic Deep',
    description: {
      en: 'Deep, resonant baritone male voice with strong vocal presence and steady rhythm. Authoritative yet attractive, with trailer-style emphasis and powerful sentence endings. Feels masculine, confident, and seductive, often used for dramatic narration or premium branding.',
      zh: '深沉共鸣的男中音，声音存在感极强，节奏稳健。既有权威感又充满吸引力，带有预告片式的重音强调和有力的句尾。给人一种阳刚、自信且迷人的感觉，常用于戏剧性旁白或高端品牌宣传。',
      ko: '깊고 울림이 있는 바리톤 남성 목소리, 강한 성량과 안정적인 리듬. 권위적이면서도 매력적이며, 예고편 스타일의 강조와 강력한 문장 끝맺음이 특징. 남성적이고 자신감 넘치며 유혹적인 느낌으로, 드라마틱한 내레이션이나 프리미엄 브랜딩에 자주 사용됨.',
    },
  },
  {
    id: 'fresh_youth',
    name: 'Fresh Youth',
    description: {
      en: 'Bright, energetic young male voice with clear articulation and medium-fast pacing. Friendly, optimistic, and approachable tone. Sounds like a cheerful college student, full of vitality and sincerity, suitable for casual, positive, and everyday scenarios.',
      zh: '明亮充满活力的年轻男性声音，咬字清晰，语速中等偏快。语气友好、乐观且平易近人。听起来像是一个开朗的男大学生，充满朝气和真诚，非常适合轻松、积极和日常化的场景。',
      ko: '밝고 에너지 넘치는 젊은 남성 목소리, 명확한 발음과 중간보다 약간 빠른 속도. 친근하고 낙관적이며 접근하기 쉬운 톤. 명랑한 대학생처럼 들리며, 활력과 진정성이 넘쳐 캐주얼하고 긍정적인 일상 시나리오에 적합함.',
    },
  },
  {
    id: 'romantic_oppa',
    name: 'Romantic Oppa',
    description: {
      en: 'Soft, emotional male voice with slight huskiness and intimate delivery. Slower pace with gentle emphasis and warm tone. Feels sincere, affectionate, and romantic, like a K-drama male lead whispering heartfelt words.',
      zh: '温柔深情的男性声音，带有轻微的沙哑感，说话方式亲密。语速较慢，语气温和而强调。给人真诚、深情和浪漫的感觉，就像韩剧男主角在耳边低语告白。',
      ko: '부드럽고 감성적인 남성 목소리, 약간의 허스키함과 친밀한 전달력. 완만한 강조와 따뜻한 톤을 가진 느린 속도. 진심 어리고 다정하며 로맨틱한 느낌으로, K-드라마 남주인공이 진심 어린 말을 속삭이는 듯함.',
    },
  },
  {
    id: 'high_cold_prince',
    name: 'Aloof Prince',
    description: {
      en: 'Clean, refined male voice with elegant articulation and restrained emotion. Polite, calm, and slightly distant. Even pacing and gentle firmness create an aristocratic, unapproachable yet charming presence, like a noble gentleman.',
      zh: '干净精致的男性声音，咬字优雅，情感克制。礼貌、冷静且略带疏离感。均匀的语速和温和的坚定感营造出一种贵族般、难以接近但充满魅力的存在感，像是一位高贵的绅士或王子。',
      ko: '깔끔하고 세련된 남성 목소리, 우아한 발음과 절제된 감정. 예의 바르고 차분하며 약간 거리감이 있음. 고른 속도와 부드러운 단호함이 귀족적이고 다가가기 어렵지만 매력적인 존재감을 만들어내며, 고귀한 신사 같음.',
    },
  },

  // ==========================================
  // 🎙️ 专业/商业场景 (Professional)
  // ==========================================
  {
    id: 'crisp_pro',
    name: 'Professional Anchor',
    description: {
      en: 'Clear, articulate, and professional female voice with balanced pacing and neutral emotion. News-anchor style delivery that sounds trustworthy, intelligent, and composed. Emphasizes clarity and credibility, ideal for informational or corporate content.',
      zh: '清晰、字正腔圆的专业女性声音，语速平衡，情感中立。新闻主播式的表达，听起来值得信赖、知性且沉稳。强调清晰度和可信度，非常适合资讯类或企业宣传内容。',
      ko: '명확하고 또렷하며 전문적인 여성 목소리, 균형 잡힌 속도와 중립적인 감정. 뉴스 앵커 스타일의 전달력으로 신뢰감 있고 지적이며 침착하게 들림. 명확성과 신뢰성을 강조하며, 정보 전달이나 기업 콘텐츠에 이상적임.',
    },
  },
  {
    id: 'high_energy_host',
    name: 'Hype Salesman',
    description: {
      en: 'Fast-paced, high-energy male voice with strong volume and emotional intensity. Excited, persuasive, and urgent delivery. Frequently stresses key selling points, creating pressure and enthusiasm typical of livestream shopping and aggressive sales environments.',
      zh: '快节奏、高能量的男性声音，音量大且情感强烈。语气兴奋、具有说服力且带有紧迫感。频繁强调核心卖点，营造出直播带货和促销环境中典型的压迫感和热情。',
      ko: '빠른 속도와 높은 에너지를 가진 남성 목소리, 큰 볼륨과 강한 감정 강도. 흥분되고 설득력 있으며 긴박한 전달력. 주요 판매 포인트를 자주 강조하며, 라이브 커머스나 공격적인 영업 환경에서 흔히 볼 수 있는 압박감과 열정을 조성함.',
    },
  },
];

// 反向提示词 (加强版：包含特定痛点 + 大模型通用缺陷)
export const COMMERCIAL_VIDEO_NEGATIVE_PROMPT = `distorted face, plastic skin, AI generated look, uncanny valley, doll-like, dead eyes, stiff facial expression, bad makeup, bad lip sync, fused mouth, blurred mouth, mouth not moving, mouth open but no sound, floating teeth, muted, gibberish, mumbling, nonsensical speech, incoherent voice, distorted audio, static noise, background noise, robotic voice, morphing, shape shifting, disappearing body parts, melting, dissolving, floating objects, physics defying, clipping, objects passing through each other, liquid body, glitching, flickering, frame tearing, artifacts, noise, grain, compression artifacts, jump cuts, abrupt transitions, rapid cuts, fast editing, repetitive cuts, strobing, logical inconsistency, static image, slide show, motionless, hyper-speed, chaotic movement, erratic motion, shaky camera, unstable camera, dizzying, out of frame, cut off, bad composition, overexposed, underexposed, blurry, low resolution, pixelated, low quality, worst quality, bad anatomy, bad hands, extra fingers, missing fingers, extra limbs, mutated, disfigured, gross proportions, malformed limbs, cartoon, 3d render, illustration, painting, anime, sketch, drawing, cgi`;
