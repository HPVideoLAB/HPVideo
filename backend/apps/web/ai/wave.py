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
  "wan-2.7": {
    "480": {"5": 0.375, "10": 0.75},
    "720": {"5": 0.75, "10": 1.5},
    "1080": {"5": 1.125, "10": 2.25}
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
  "hailuo-2.3": {
    "*": {"6": 0.345, "10": 0.84}
  },
  "seedance-2.0": {
    "*": {"6": 0.30, "9": 0.45, "12": 0.60}
  },
  "kling-3.0": {
    "*": {"5": 2.10, "10": 4.20}
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


class WaveApi:
    
	def check_model(self, model: str):
		# Keep in sync with MODEL_REGISTRY in x402pay.py and `amounts` above.
		models = [
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
		if source == 'pixverse':
			data = {
				"duration": duration,
				"prompt": prompt,
				"aspect_ratio": size,
				"resolution": "720p"
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
			print(f"Request Err: {e}")
			return None

	# Get Video By Video ID	
	def get_prediction_result(self, requestId: str):
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
					amount = f"${price}"

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
