import { WEBUI_BASE_URL } from '$lib/constants';

export const getBackendConfig = async () => {
	let error = null;

	const res = await fetch(`${WEBUI_BASE_URL}/api/config`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const defaultBackendConfig = async () => {
	return {
    "status": true,
    "name": "HPVideo",
    "version": "0.1.125",
    "auth": true,
    "default_locale": "en-US",
    "images": false,
    "default_models": "wan-2.5",
    "default_prompt_suggestions": [
				{
					"title": [
							"Micro Fluids – 《Annihilation》-Style Organic Texture",
							"Using AI to replicate fluid dynamics, presenting within 5-10 seconds the filamentous diffusion of ink droplets in water in slow motion, the amber glow of ice spheres melting in whiskey glasses, and the nebula-like vortices formed by milk swirling in coffee. Emphasize the iridescence of fluid refraction and the tremor of surface tension to generate sci-fi short films with biological texture."
					],
					"content": "Using AI to replicate fluid dynamics, presenting within 5-10 seconds the filamentous diffusion of ink droplets in water in slow motion, the amber glow of ice spheres melting in whiskey glasses, and the nebula-like vortices formed by milk swirling in coffee. Emphasize the iridescence of fluid refraction and the tremor of surface tension to generate sci-fi short films with biological texture."
				},
        {
            "title": [
                "Life in Bloom – 《Planet Earth》 Time-Lapse Aesthetics",
                "Present the overwhelming of time compression through macro cinematic photography: the silk-textured petals of night-blooming cereus unfurling under moonlight, exploring shots of vines climbing ancient walls, mushrooms breaking through soil with spores erupting like smoke. Use low-angle backlighting to highlight life contours, creating nature documentary-level blooming moments."
            ],
            "content": "Present the overwhelming of time compression through macro cinematic photography: the silk-textured petals of night-blooming cereus unfurling under moonlight, exploring shots of vines climbing ancient walls, mushrooms breaking through soil with spores erupting like smoke. Use low-angle backlighting to highlight life contours, creating nature documentary-level blooming moments."
        },
        {
            "title": [
                "Light & Particles – 《Blade Runner》 Cyber Atmosphere",
                "Construct flowing reflections of neon lights in rainy night puddles, holographic particles converging into growing digital city models, blue vortices of cigarette smoke swirling in dim light. Employ high-contrast color schemes and particle trail effects to craft futuristic emotional spaces."
            ],
            "content": "Construct flowing reflections of neon lights in rainy night puddles, holographic particles converging into growing digital city models, blue vortices of cigarette smoke swirling in dim light. Employ high-contrast color schemes and particle trail effects to craft futuristic emotional spaces."
        },
				{
					"title": [
							"Spatial Navigation – 《Inception》 Geometric Maze",
							"Create infinite rotating Baroque staircases with moving light/shadow, beams of light shifting between shelves in symmetrical libraries, tunnel lights extending with pulsating rhythm. Utilize forced perspective composition and dynamic light tracking to build dizzying illusions of depth."
					],
					"content": "Create infinite rotating Baroque staircases with moving light/shadow, beams of light shifting between shelves in symmetrical libraries, tunnel lights extending with pulsating rhythm. Utilize forced perspective composition and dynamic light tracking to build dizzying illusions of depth."
				},
        {
            "title": [
                "Animated Still Life – 《Harry Potter》 Magical Moments",
                "Show feather pens autonomously writing on parchment with ink appearing, precise interlocking operation of antique clock gears, Lego bricks self-assembling into castle stop-motion. Employ close-up dolly shots and magical realist lighting to create mysterious narratives from everyday objects."
            ],
            "content": "Show feather pens autonomously writing on parchment with ink appearing, precise interlocking operation of antique clock gears, Lego bricks self-assembling into castle stop-motion. Employ close-up dolly shots and magical realist lighting to create mysterious narratives from everyday objects."
        },
        {
            "title": [
                "Material Flow – 《Hero》 Color Poetics",
                "Display Chinese ink spreading on rice paper to outline mountain-water landscapes, colored silk dancing with folds in zero gravity, lava cooling with surface cracks revealing incandescent inner light. Apply color emotion theory and material close-up cinematography to create visual poetry like flowing paintings."
            ],
            "content": "Display Chinese ink spreading on rice paper to outline mountain-water landscapes, colored silk dancing with folds in zero gravity, lava cooling with surface cracks revealing incandescent inner light. Apply color emotion theory and material close-up cinematography to create visual poetry like flowing paintings."
        }
    ],
    "trusted_header_auth": false,
    "admin_export_enabled": true
	}
};

export const getChangelog = async () => {
	let error = null;

	const res = await fetch(`${WEBUI_BASE_URL}/api/changelog`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getVersionUpdates = async () => {
	let error = null;

	const res = await fetch(`${WEBUI_BASE_URL}/api/version/updates`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getModelFilterConfig = async (token: string) => {
	let error = null;

	const res = await fetch(`${WEBUI_BASE_URL}/api/config/model/filter`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const updateModelFilterConfig = async (
	token: string,
	enabled: boolean,
	models: string[]
) => {
	let error = null;

	const res = await fetch(`${WEBUI_BASE_URL}/api/config/model/filter`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			enabled: enabled,
			models: models
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getWebhookUrl = async (token: string) => {
	let error = null;

	const res = await fetch(`${WEBUI_BASE_URL}/api/webhook`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res.url;
};

export const updateWebhookUrl = async (token: string, url: string) => {
	let error = null;

	const res = await fetch(`${WEBUI_BASE_URL}/api/webhook`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			url: url
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res.url;
};
