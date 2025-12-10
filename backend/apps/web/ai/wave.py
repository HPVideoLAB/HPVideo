import os
import requests
from apps.web.models.aimodel import AiModelReq
from apps.web.models.pay import PayTableInstall


wave_url = os.getenv("WAVESPEED_URL")
wave_key = os.getenv("WAVESPEED_KEY")

amounts = {
  "wan-2.5": {
    "480": {"5": 0.375, "10": 0.75},
    "720": {"5": 0.75, "10": 1.5}, 
    "1080": {"5": 1.125, "10": 2.25}
  },
  "sora-2": {
    "720": {"4": 0.45, "8": 1.35, "12": 2.7}
  },
  "ovi": {
    "540": {"5": 0.225}
  },
  "veo3.1": {
    "*": {"4": 2.4, "6": 3.6, "8": 4.8}
  },
  "ltx-2-pro": {
    "*": {"6": 0.54, "8": 0.72, "10": 0.9}
  },
  "hailuo-02": {
    "*": {"6": 0.345, "10": 0.84}
  },
  "seedance": {
    "*": {"6": 0.27, "9": 0.405, "12": 0.54}
  },
  "kling": {
    "*": {"5": 1.95, "10": 3.9}
  },
  "pixverse": {
    "*": {"5": 0.525, "8": 1.05}
  }
}


class WaveApi:
    
	def check_model(self, model: str):
		models = ["wan-2.5"]
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
		amount_dict = amounts.get(model)
		amount = "$0.02"
		if amount_dict is not None:
			for key in amount_dict:
				if size.find(key) != -1:
					amount = f"${amount_dict.get(key).get(str(duration))}"
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
