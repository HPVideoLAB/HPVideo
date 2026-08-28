import os
import requests
from apps.web.models.aimodel import AiModelReq
from apps.web.models.pay import PayTableInstall


wave_url = os.getenv("WAVESPEED_URL")
wave_key = os.getenv("WAVESPEED_KEY")

# Pricing tiers per model slug. Slugs must match MODEL_REGISTRY in x402pay.py.
# Updated 2026-04-22: Sora 2 removed (OpenAI API shutting down 2026-09-24),
# replaced by Luma Ray 2 + Vidu Q3. All models upgraded to latest WaveSpeed versions.
amounts = {
  # HappyHorse-1.0 (Alibaba, native joint audio+video, 7-lang lip-sync).
  # Listed at $0.7/run on WaveSpeed; we set 720p/5s = $0.75 to match the
  # canonical clip price tier across the rest of the registry.
  # HappyHorse 1.1 (raw WaveSpeed: $0.14/s @720p, $0.189/s @1080p)
  "happyhorse-1.0": {
    "720":  {"5": 0.70, "8": 1.12},
    "1080": {"5": 0.945, "8": 1.512}
  },
  # WAN 3.0 (raw WaveSpeed: $0.05/s@480, $0.10/s@720, $0.20/s@1080)
  "wan-2.7": {
    "480": {"5": 0.25, "10": 0.50},
    "720": {"5": 0.50, "10": 1.00},
    "1080": {"5": 1.00, "10": 2.00}
  },
  "ovi": {
    "540": {"5": 0.225}
  },
  "veo3.1": {
    "*": {"4": 2.4, "6": 3.6, "8": 4.8}
  },
  "ltx-2.3": {
    "*": {"6": 0.54, "8": 0.72, "10": 0.9}
  },
  # MiniMax H3 (raw WaveSpeed: $0.10/s @768p — the pinned resolution)
  "hailuo-2.3": {
    "*": {"6": 0.60, "10": 1.00}
  },
  # Seedance 2.5 (raw WaveSpeed: $0.36/s @720p — the pinned resolution)
  "seedance-2.0": {
    "*": {"6": 2.16, "9": 3.24, "12": 4.32}
  },
  # Kling O3 Std (raw WaveSpeed: $0.084/s, no sound)
  "kling-3.0": {
    "*": {"5": 0.42, "10": 0.84}
  },
  "pixverse-v6": {
    "*": {"5": 0.60, "8": 1.20}
  },
  # New models replacing Sora 2's tier
  "luma-ray-2": {
    "*": {"5": 0.75, "10": 1.50}
  },
  "vidu-q3": {
    "*": {"4": 0.40, "8": 0.80}
  }
}

# ---------------------------------------------------------------------------
# Atlas Cloud — second video provider (cheaper on most models). Default source
# per job = whichever provider is cheaper; WaveSpeed is the failover. The
# provider that ran a job is encoded in the returned request id ("atlas:<id>"
# vs a bare WaveSpeed id) so the separate poll call routes correctly.
# Keyed by the WaveSpeed `model` path we pass into x402create.
# Prices are raw $/second (verified 2026-08-28). Models NOT listed here have no
# Atlas route and always use WaveSpeed (h3 flat-priced/duration-unverified,
# ltx price suspicious, luma ray-2 absent).
# ---------------------------------------------------------------------------
atlas_url = os.getenv("ATLAS_URL", "https://api.atlascloud.ai").rstrip("/")
atlas_key = os.getenv("ATLAS_KEY", "")
ATLAS_ENABLED = bool(atlas_key) and os.getenv("ATLAS_ENABLED", "1") != "0"

ATLAS_ROUTE = {
    "happyhorse-1.1/text-to-video":     {"atlas": "alibaba/happyhorse-1.1/text-to-video",     "atlas_ps": 0.07},
    "kling-video-o3-std/text-to-video": {"atlas": "kwaivgi/kling-video-o3-std/text-to-video", "atlas_ps": 0.071},
    "seedance-2.5/text-to-video":       {"atlas": "bytedance/seedance-2.5/text-to-video",     "atlas_ps": 0.134},
    "pixverse-v6/text-to-video":        {"atlas": "pixverse/v6/text-to-video",                "atlas_ps": 0.025},
    "veo3.1/text-to-video":             {"atlas": "google/veo3.1/text-to-video",              "atlas_ps": 0.20},
    "wan-3.0/text-to-video":            {"atlas": "alibaba/wan-3.0/text-to-video",            "atlas_ps": 0.04},
    "q3/text-to-video":                 {"atlas": "vidu/q3-turbo/text-to-video",              "atlas_ps": 0.034},
}
# WaveSpeed raw $/second per model substring (from `amounts`) — for cost compare.
WS_PS = {
    "happyhorse-1.1": 0.14, "kling-video-o3-std": 0.084, "h3": 0.10, "seedance-2.5": 0.36,
    "pixverse-v6": 0.12, "veo3.1": 0.60, "wan-3.0": 0.10, "ray-2": 0.15, "ltx-2.3": 0.09, "q3": 0.10,
}

def _ws_ps(model: str) -> float:
    for k, v in WS_PS.items():
        if k in model:
            return v
    return 0.0


class WaveApi:
    
	def check_model(self, model: str):
		# Keep in sync with MODEL_REGISTRY in x402pay.py and `amounts` above.
		models = [
			"happyhorse-1.0",
			"wan-2.7",
			"ovi",
			"veo3.1",
			"ltx-2.3",
			"hailuo-2.3",
			"seedance-2.0",
			"kling-3.0",
			"pixverse-v6",
			"luma-ray-2",
			"vidu-q3",
		]
		return model in models

	# Create Video ID      
	def create(self, param: AiModelReq):
		headers = {
			"Authorization": f'Bearer {wave_key}',
			"Content-Type": "application/json"
		}
		user_data_list = [item for item in param.messages if item.get("role") == "user"]
		last_message = user_data_list[-1]
		contents = self.judge_content_type(last_message.get("content"))
		if param.source == 'google':
			data = {
				"duration": param.duration,
				"prompt": contents.get("text"),
				"aspect_ratio": param.size,
				"generate_audio": True,
				"resolution": "720p"
			}
		elif param.source == 'pixverse':
			data = {
				"duration": param.duration,
				"prompt": contents.get("text"),
				"aspect_ratio": param.size,
				"resolution": "720p"
			}
		elif param.source == 'bytedance' or param.source == 'kwaivgi':
			data = {
				"duration": param.duration,
				"prompt": contents.get("text"),
				"aspect_ratio": param.size
			}
		else:
			data = {
				"duration": param.duration,
				"prompt": contents.get("text"),
				"size": param.size
			}
		if contents.get("image") is not None:
			data["image"] = contents.get("image").get("url")

		try:
			url = f'{wave_url}/{param.source}/{param.model}'
			response = requests.post(url, json=data, headers=headers)
			response.raise_for_status()
			return response.json()
		except Exception as e:
			print(f"Request Err: {e}, {response.json()}")
			return None
		
	# Create X402 Video ID
	def x402create(self, source: str, model: str, prompt: str, duration: int, size: str):
		headers = {
			"Authorization": f'Bearer {wave_key}',
			"Content-Type": "application/json"
		}
		# --- Provider routing: prefer Atlas Cloud when it's cheaper for this
		# job; on any Atlas create error, fall through to WaveSpeed below.
		# The provider is encoded in the returned id ("atlas:<id>") so the
		# later get_prediction_result poll routes to the right API.
		route = ATLAS_ROUTE.get(model)
		if ATLAS_ENABLED and route:
			atlas_cost = route["atlas_ps"] * (duration or 0)
			ws_cost = _ws_ps(model) * (duration or 0)
			if atlas_cost <= ws_cost:
				aid = self._atlas_create(route["atlas"], prompt, duration, size)
				if aid:
					return {"code": 200, "data": {"id": "atlas:" + aid}}
				print(f"[wave] atlas create failed for {model}; failing over to WaveSpeed")
		# Map a Canvas-style resolution token ("720p" / "480p" / "1080p")
		# to a 16:9 aspect ratio when the model wants aspect_ratio instead
		# of size. This lets Canvas pass `resolution` through unchanged
		# and the wave client figures out per-vendor format.
		def _to_aspect_ratio(s: str) -> str:
			# If caller already gave us an aspect ratio, keep it.
			if s and ":" in s:
				return s
			return "16:9"

		# Resolution: prefer explicit "720p"/"1080p" tokens; otherwise default 720p.
		resolution_token = "1080p" if (size and "1080" in size) else "720p"

		if source == 'alibaba':
			# Alibaba HappyHorse (joint audio+video) AND WAN 3.0 both use the
			# modern aspect_ratio + resolution split (WAN 3.0 replaced 2.7's
			# plain `size` shape as of 2026-08-27).
			data = {
				"duration": duration,
				"prompt": prompt,
				"aspect_ratio": _to_aspect_ratio(size),
				"resolution": resolution_token
			}
		elif source == 'pixverse':
			data = {
				"duration": duration,
				"prompt": prompt,
				"aspect_ratio": _to_aspect_ratio(size),
				"resolution": "720p"
			}
		elif source == 'google':
			# Veo 3.1: aspect_ratio (not size), generate_audio for in-video
			# dialogue + ambient audio. Without these the API 400s.
			data = {
				"duration": duration,
				"prompt": prompt,
				"aspect_ratio": _to_aspect_ratio(size),
				"generate_audio": True,
				"resolution": "720p"
			}
		elif source == 'bytedance':
			# Seedance 2.5: pin resolution=720p so we bill the $0.36/s tier
			# (its raw price in `amounts`), not the model's pricier default.
			data = {
				"duration": duration,
				"prompt": prompt,
				"aspect_ratio": _to_aspect_ratio(size),
				"resolution": "720p"
			}
		elif source == 'kwaivgi':
			# Kling O3 Std: aspect_ratio only. `sound` defaults off — leaving
			# it out keeps the cheaper $0.084/s (no-audio) tier.
			data = {
				"duration": duration,
				"prompt": prompt,
				"aspect_ratio": _to_aspect_ratio(size)
			}
		elif source == 'minimax':
			# MiniMax H3: aspect_ratio + resolution. Pin 768p ($0.10/s), the
			# cheapest tier and the price recorded in `amounts`.
			data = {
				"duration": duration,
				"prompt": prompt,
				"aspect_ratio": _to_aspect_ratio(size),
				"resolution": "768p"
			}
		else:
			data = {
				"duration": duration,
				"prompt": prompt,
				"size": size
			}

		try:
			url = f'{wave_url}/{source}/{model}'
			response = requests.post(url, json=data, headers=headers)
			response.raise_for_status()
			return response.json()
		except Exception as e:
			body = ""
			try:
				body = response.text[:400] if 'response' in locals() else ""
			except Exception:
				pass
			print(f"Request Err: {e} body={body!r}")
			return None

	# Create X402 Video ID — image-to-video variant.
	#
	# Used by Canvas multi-shot chaining: the last frame of shot N becomes
	# the first frame of shot N+1, so character + scene continuity carries
	# across cuts. Currently wired for HappyHorse 1.0 (others may follow).
	def x402create_i2v(self, source: str, model: str, prompt: str,
	                   duration: int, size: str, image_url: str):
		headers = {
			"Authorization": f'Bearer {wave_key}',
			"Content-Type": "application/json"
		}
		def _to_aspect_ratio(s: str) -> str:
			if s and ":" in s:
				return s
			return "16:9"
		resolution_token = "1080p" if (size and "1080" in size) else "720p"

		# HappyHorse 1.0 i2v wants `image` + prompt + aspect_ratio + resolution + duration.
		data = {
			"image": image_url,
			"prompt": prompt,
			"duration": duration,
			"aspect_ratio": _to_aspect_ratio(size),
			"resolution": resolution_token,
		}

		# Build the i2v URL by swapping the model path.  HappyHorse t2v lives
		# at `alibaba/happyhorse-1.0/text-to-video`, i2v at
		# `alibaba/happyhorse-1.0/image-to-video`.  Same pattern for other
		# i2v-capable models if we add them later.
		i2v_model = model.replace("/text-to-video", "/image-to-video")
		if i2v_model == model:
			# Caller passed an already-i2v path, leave it.
			i2v_model = model

		try:
			url = f'{wave_url}/{source}/{i2v_model}'
			response = requests.post(url, json=data, headers=headers)
			response.raise_for_status()
			return response.json()
		except Exception as e:
			body = ""
			try:
				body = response.text[:400] if 'response' in locals() else ""
			except Exception:
				pass
			print(f"i2v Request Err: {e} body={body!r}")
			return None

	# Create X402 Image ID — text-to-image variant.
	#
	# Used by Canvas imagegen blocks. Same poll endpoint as t2v, just
	# different request body shape per WaveSpeed image-gen schema.
	def x402create_t2i(self, source: str, model: str, prompt: str,
	                   aspect_ratio: str = "16:9",
	                   resolution: str = "1k",
	                   quality: str = "medium"):
		headers = {
			"Authorization": f'Bearer {wave_key}',
			"Content-Type": "application/json"
		}
		# WaveSpeed t2i common shape — works for openai/gpt-image-2,
		# google/nano-banana-2, bytedance/seedream-v5.0-lite.
		data = {
			"prompt": prompt,
			"aspect_ratio": aspect_ratio if aspect_ratio else "16:9",
			"resolution": resolution if resolution else "1k",
			"quality": quality if quality else "medium",
		}
		try:
			url = f'{wave_url}/{source}/{model}'
			response = requests.post(url, json=data, headers=headers)
			response.raise_for_status()
			return response.json()
		except Exception as e:
			body = ""
			try:
				body = response.text[:400] if 'response' in locals() else ""
			except Exception:
				pass
			print(f"t2i Request Err: {e} body={body!r}")
			return None

	# --- Atlas Cloud provider helpers -------------------------------------
	def _atlas_create(self, atlas_model: str, prompt: str, duration: int, size: str):
		"""Create an Atlas Cloud video job. Returns the request id or None."""
		def _ratio(s):
			if s and ":" in s:
				return s
			if s and "*" in s:
				try:
					w, h = s.split("*")
					return "9:16" if int(h) > int(w) else "16:9"
				except Exception:
					return "16:9"
			return "16:9"
		body = {"model": atlas_model, "prompt": prompt, "duration": duration,
		        "ratio": _ratio(size), "resolution": "720p"}
		try:
			r = requests.post(f"{atlas_url}/api/v1/model/generateVideo", json=body,
			                  headers={"Authorization": f"Bearer {atlas_key}",
			                           "Content-Type": "application/json"}, timeout=60)
			if r.status_code != 200:
				print(f"[atlas] create {r.status_code}: {r.text[:300]}")
				return None
			d = (r.json() or {}).get("data") or {}
			return d.get("id") or d.get("request_id")
		except Exception as e:
			print(f"[atlas] create error: {e}")
			return None

	def _atlas_poll(self, rid: str):
		"""Poll an Atlas job; normalize to the same shape WaveSpeed poll returns
		so callers read data.status + data.outputs unchanged."""
		try:
			r = requests.get(f"{atlas_url}/api/v1/model/prediction/{rid}",
			                 headers={"Authorization": f"Bearer {atlas_key}"}, timeout=30)
			r.raise_for_status()
			d = (r.json() or {}).get("data") or {}
			outs = d.get("outputs") or ([d.get("output")] if d.get("output") else [])
			return {"success": True, "data": {"status": d.get("status"),
			                                  "outputs": outs, "error": d.get("error")}}
		except requests.exceptions.HTTPError as e:
			return {"success": False, "error": f"HTTP Err: {str(e)}"}
		except requests.exceptions.RequestException as e:
			return {"success": False, "error": f"Err: {str(e)}"}

	# Get Video By Video ID
	def get_prediction_result(self, requestId: str):
		if requestId and requestId.startswith("atlas:"):
			return self._atlas_poll(requestId[len("atlas:"):])
		url = f"{wave_url}/predictions/{requestId}/result"
		headers = {
			"Authorization": f"Bearer {wave_key}"
		}
		try:
			response = requests.get(url, headers=headers)
			response.raise_for_status()
			return {
				"success": True,
				"data": response.json()
			}	
		except requests.exceptions.HTTPError as e:
			return {
				"success": False,
				"error": f"HTTP Err: {str(e)}",
				"status_code": response.status_code,
				"response_text": response.text
			}
		except requests.exceptions.RequestException as e:
			return {
				"success": False,
				"error": f"Err: {str(e)}"
      }

	# Get the model price
	def calc_model_price(self, model: str, duration: int, size: str, messageid: str):
		# Defensive: callers occasionally pass None for size/duration when
		# the request didn't include those query params. The substring
		# match below would AttributeError on None and 500 the request.
		size = size if size is not None else ""
		duration = duration if duration is not None else ""
		amount_dict = amounts.get(model)
		amount = "$0.02"
		if amount_dict is not None:
			# "*" acts as an explicit wildcard: it matches any `size` value.
			# Without this branch, `size.find("*")` returns -1 for sizes like
			# "16:9" that don't contain a literal asterisk, causing every
			# wildcard-priced model (8/10) to silently fall back to $0.02 —
			# a 100x+ undercharge per call. Literal keys (e.g. "480", "720")
			# continue to match via substring.
			matched_tier = None
			if "*" in amount_dict:
				matched_tier = amount_dict["*"]
			else:
				for key in amount_dict:
					if size.find(key) != -1:
						matched_tier = amount_dict[key]
						break

			if matched_tier is not None:
				price = matched_tier.get(str(duration))
				if price is not None:
					# `amounts` are raw WaveSpeed cost; apply the 1.1× (10%)
					# markup so the chat/creator x402 charge matches the rest
					# of the site (unified 2026-08-28). de/index.ts `amount`
					# on the frontend is bumped ×1.1 to match this.
					amount = f"${round(price * 1.1, 4)}"

			pay = PayTableInstall.get_by_messageid(messageid)
			if pay is None:
				PayTableInstall.insert_pay("", model, size, duration, amount, messageid, "", False, True)
			return {
        "amount": amount,
        "messageid": messageid
    }

	def judge_content_type(self, content: object):
		if isinstance(content, str):
			return {"text": content, "image": None}
		elif isinstance(content, list):
			text = ""
			image = ""
			has_text = any(item.get("type") == "text" for item in content)
			if has_text:
				text_list = [item.get("text", "").strip() for item in content if item.get("type") == "text"]
				text = text_list[0]

			has_image = any(item.get("type") == "image_url" for item in content)
			if has_image:
				image_list = [item.get("image_url", "") for item in content if item.get("type") == "image_url"]
				image = image_list[0]
			return {"text": text, "image": image}
		else:
			return {"text": content, "image": None}
			

WaveApiInstance = WaveApi()
