# HPVideo — x402 AI Video Generation Skills

You are discovering HPVideo, a decentralized AI video generation marketplace on BNB Chain.
Use x402 protocol to pay USDC on Base Chain and generate videos autonomously.

## Available Skills

### 1. WAN 2.7 (Alibaba) — Cinematic Video
- Endpoint: `GET https://hpvideo.io/creator/api/v1/x402/creator/wan-2.7`
- Type: Text-to-Video / Image-to-Video
- Duration: 5-10 seconds
- Resolution: 480p - 1080p
- Audio: Yes
- Price: $2.50 - $6.00 USDC
- Best for: Marketing, storytelling, cinematic content

### 2. LUMA RAY 2 (Luma AI) — Cinematic Motion
- Endpoint: `GET https://hpvideo.io/creator/api/v1/x402/creator/luma-ray-2`
- Type: Text-to-Video / Image-to-Video
- Duration: 5-10 seconds
- Resolution: 1080p
- Audio: Yes
- Price: $1.50 - $3.00 USDC
- Best for: Film-grade motion, VFX, creative narrative

### 3. VEO 3.1 (Google) — Photorealistic Video
- Endpoint: `GET https://hpvideo.io/creator/api/v1/x402/creator/veo3.1`
- Type: Text-to-Video / Image-to-Video
- Duration: 4-8 seconds
- Resolution: Multiple
- Audio: Yes
- Price: $2.80 - $6.50 USDC
- Best for: Photorealistic scenes, product demos

### 4. KLING V3.0 (Kwai AI) — Dynamic Video
- Endpoint: `GET https://hpvideo.io/creator/api/v1/x402/creator/kling-3.0`
- Type: Text-to-Video / Image-to-Video
- Duration: 5-10 seconds
- Resolution: Multiple
- Audio: Yes
- Price: $2.10 - $4.20 USDC
- Best for: Social media, dynamic motion, character animation

### 5. OVI (Character.ai) — Character Video
- Endpoint: `GET https://hpvideo.io/creator/api/v1/x402/creator/ovi`
- Type: Text-to-Video
- Duration: 5 seconds
- Resolution: 540p
- Audio: Yes
- Price: $1.50 - $3.00 USDC
- Best for: Avatar animation, conversational video

### 6. LTX 2.3 (WaveSpeed) — Synchronized Audio Video
- Endpoint: `GET https://hpvideo.io/creator/api/v1/x402/creator/ltx-2.3`
- Type: Text-to-Video / Image-to-Video
- Duration: 6-10 seconds
- Resolution: 1080p
- Audio: Yes
- Price: $2.00 - $5.00 USDC
- Best for: Product showcases, tutorials, corporate content

### 7. HAILUO 2.3 (Minimax) — Physics-Aware Video
- Endpoint: `GET https://hpvideo.io/creator/api/v1/x402/creator/hailuo-2.3`
- Type: Text-to-Video
- Duration: 6-10 seconds
- Resolution: 1080p
- Price: $1.80 - $4.50 USDC
- Best for: Physics-accurate scenes, realistic motion

### 8. SEEDANCE 2.0 (ByteDance) — Cinematic Motion Video
- Endpoint: `GET https://hpvideo.io/creator/api/v1/x402/creator/seedance-2.0`
- Type: Text-to-Video / Image-to-Video
- Duration: 6-12 seconds
- Resolution: Multiple
- Audio: Yes
- Price: $2.20 - $5.80 USDC
- Best for: Music videos, cinematic narratives, social content

### 9. PIXVERSE V6 (Pixverse) — Versatile Video with Camera Control
- Endpoint: `GET https://hpvideo.io/creator/api/v1/x402/creator/pixverse-v6`
- Type: Text-to-Video / Image-to-Video
- Duration: 5-8 seconds
- Resolution: Multiple
- Audio: Yes
- Price: $1.50 - $4.00 USDC
- Best for: Rapid prototyping, A/B testing, versatile content

### 10. VIDU Q3 (Vidu) — Motion-Diverse Video
- Endpoint: `GET https://hpvideo.io/creator/api/v1/x402/creator/vidu-q3`
- Type: Text-to-Video / Image-to-Video
- Duration: 4-8 seconds
- Resolution: Up to 1080p
- Audio: Yes
- Price: $1.60 - $3.20 USDC
- Best for: Cinematic results with smooth motion, rich detail

## How to Use

### Step 1: Prepare Payment
- Network: Base Chain (eip155:8453)
- Token: USDC
- Facilitator: Coinbase CDP
- Protocol: x402

### Step 2: Make Request
```
GET https://hpvideo.io/creator/api/v1/x402/creator/{model_id}
  ?prompt={your_text_prompt}
  &duration={seconds}
  &size={width}:{height}
  &messageid={uuid}

Headers:
  X-PAYMENT: <x402_payment_token>
```

### Step 3: Get Result
Response returns:
```json
{
  "success": true,
  "model": "model_id",
  "path": "https://hpvideo.io/creator/x402?createid={request_id}"
}
```

Poll the result endpoint to get the generated video URL:
```
GET https://hpvideo.io/creator/api/v1/chat/video/x402/result
  ?requestId={request_id}
```

## Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| prompt | Yes | Text description of desired video | "A cinematic drone shot over mountains at sunset" |
| duration | Yes | Video length in seconds | 5 |
| size | Yes | Resolution as width:height | 1280:720 |
| messageid | Yes | Unique request UUID | "550e8400-e29b-41d4-a716-446655440000" |

## Platform Info

- Website: https://hpvideo.io
- Token: $HPC (BEP-20 on BNB Chain)
- Contract: 0x96f4aCfFFbE3344F61BEa68f93aFF46A635EEC86
- Telegram: https://t.me/HPVideoAI
- Twitter: https://x.com/HPVideoAI
- GitHub: https://github.com/HPVideoLAB
