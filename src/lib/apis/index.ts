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
							"Popular Science",
							"Understand the principles of quantum computing through animated analogies."
					],
					"content": "Knowledge Popularization Video (Taking 'Quantum Computing' as an Example)\n・Video Type: Motion Graphics Animation + Voiceover \n・Core Concept: Use simple and easy-to-understand metaphors to explain the basic principles of quantum computing (such as qubits, superposition, entanglement) and why it is more powerful than traditional computers. \n・Target Audience: General public interested in science but without a professional background. \n・Shot-by-Shot Prompt: \n 1. Opening Scene: A close-up of a CPU chip from a traditional computer, next to a futuristic, glowing mysterious crystal (representing a quantum chip). On-screen Text: 'When traditional computers reach their limits...' \n 2. Metaphor 1 - Coin: Show a coin spinning on a tabletop. Voiceover: 'A traditional bit is like a stationary coin—it’s either heads or tails. But a quantum bit...' The coin starts to blur and simultaneously shows both heads and tails (representing superposition). \n 3. Metaphor 2 - Maze: A complex maze. The path of a traditional computer is like a single line, trying one route at a time and often hitting dead ends. The path of a quantum computer is like a glowing net, exploring all possible routes at the same time and finding the exit instantly. \n 4. Application Outlook: Rapidly switching scenes: designing new drug molecules, optimizing global logistics routes, creating more secure encryption (the original 'cracking encryption' needs to be phrased carefully, so it is revised to 'creating more secure encryption'). \n 5. Ending: The quantum chip emits a soft pulse, and the screen freezes. On-screen Text: 'This is not magic—this is the next chapter of science.'"
				},
        {
            "title": [
                "Product Review",
                "Real-shot comparison and evaluation of a phone's pros and cons."
            ],
            "content": "Product Review Video (Taking 'Flagship Smartphone' as an Example)\n・Video Type: Live-Action Shooting + Screen Recording + B-Roll\n・Core Concept: Conduct a comprehensive and objective review of a newly released flagship smartphone, focusing on the camera, performance, battery, and system experience, and provide clear pros and cons as well as purchasing recommendations.\n・Target Audience: Potential smartphone buyers, tech enthusiasts.\n・Shot-by-Shot Prompt:\n 1. Opening: The host appears with a cool transition effect, holding the new smartphone. Quickly show close-ups of the smartphone's appearance (frame, camera module).\n 2. Camera Test:\n・Daytime Samples: Switch to real-shot samples, compare side-by-side with competitors' products to highlight details and colors.\n・Night Mode: Switch from an extremely dark environment to the final photo to show the amazing night scene effect.\n・Portrait Video: The host walks and talks to show the background blur effect.\n 3. Performance Test: Record the screen while playing a large-scale game, with the frame rate counter stabilizing at the maximum value. Quickly switch between multiple apps to show its smoothness.\n 4. Disadvantages Segment: The tone of the画面 (screen) becomes slightly serious. The host points out: 'But it's not perfect...' For example, show that the charging speed is not as fast as some competitors, or a certain software function needs optimization.\n 5. Summary: The host appears again, with the smartphone placed in front of them. Clearly list 'Who it's for' and 'Who it's not for', and provide the final purchasing recommendation."
        },
        {
            "title": [
                "Life Vlog",
                "Filmed record of a healing weekend slow life."
            ],
            "content": "Lifestyle Vlog (Taking 'Slow Urban Weekend' as an Example)\n・Video Type: Live-Action Vlog\n・Core Concept: Document a healing and relaxing urban weekend, emphasizing atmosphere and emotional value rather than a packed schedule.\n・Target Audience: Young urbanites who pursue quality of life and seek leisure inspiration.\n・Shot-by-Shot Prompt:\n 1. Opening: Morning sunlight filters through the window onto a desk. A hand is brewing coffee, with coffee liquid dripping slowly (slow-motion shot). Warm background music plays.\n 2. Morning Segment: In a quiet independent bookstore, the camera pans over rows of bookshelves, and a hand strokes the spines of books. Reading on a park bench, with pigeons walking by the feet.\n 3. Noon Segment: In a cozy, atmospheric small restaurant, close-up shots of food (cheese stretching, sauce flowing). Natural empty shots of street scenes.\n 4. Afternoon Segment: Close-up shots of doing handcrafts (such as pottery, painting), showing a focused expression and the gradually taking-shape work. Alternatively, shooting a time-lapse video from a high spot in the city during dusk.\n 5. Ending: At night, the small string lights on the windowsill light up. The protagonist is writing a diary or just quietly looking out the window. Voice-over or subtitle: 'Give yourself, who has been busy all week, a break.'"
        },
				{
					"title": [
							"Story Short Film",
							"Dramatic interpretation, breaking the time loop with kindness."
					],
					"content": "Story Narrative/Micro-Drama (Taking 'Time Loop' as an Example)\n・Video Type: Drama Short Film\n・Core Concept: A person finds themselves trapped in the same day and must change one small action of their own to break the loop.\n・Target Audience: Audience who enjoy sci-fi, suspense, and warm stories.\n・Shot-by-Shot Prompt:\n 1. Opening: Close-up of an alarm clock showing '7:00 AM'. The protagonist turns off the alarm irritably. A quick montage shows his monotonous morning: squeezing into the subway, being criticized by his boss, ignoring passers-by.\n 2. Discovering the Loop: The next day, the alarm clock shows '7:00 AM' again, and everything happens exactly the same. The protagonist shows a confused and terrified expression. He draws a circle on the calendar and realizes every day is the same day.\n 3. Attempts and Failures: He tries various extreme methods (such as skipping work, spending wildly) to break the loop, but everything resets the next day.\n 4. Turning Point: He notices that he meets a depressed colleague in the elevator every day. This time, he chooses to smile and greet: 'How are you today?' The colleague has a stunned expression.\n 5. Breaking the Loop: The next day, the alarm goes off, showing '7:01 AM'. He freezes, then becomes overjoyed. Outside the window, the world continues to function. The last shot is him chatting happily with that colleague in a café."
				},
        {
            "title": [
                "Food Preparation",
                "Close-up tutorial, molten chocolate cake guide."
            ],
            "content": "Food Making Category (Taking 'Lava Chocolate Cake' as an Example)\n・Video Type: Top-Down Shot + Close-Up\n・Core Concept: Clearly show every step from ingredients to finished product, highlighting the joy of cooking and the attractive texture of the finished product.\n・Target Audience: Home baking enthusiasts, food lovers.\n・Shot-by-Shot Prompt:\n 1. Ingredient Display: A top-down shot showing all raw materials (chocolate, butter, eggs, sugar, flour) neatly arranged on the table, with a visually comfortable presentation.\n 2. Production Process:\n・Melting Chocolate: Melt chocolate and butter in a double boiler, with a close-up of the smooth liquid.\n・Mixing Batter: Beat eggs and sugar until pale, mix with the chocolate liquid, sift in flour, and stir until smooth and free of lumps.\n 3. Molding and Baking: Pour the batter into molds, clearly showing that it is only filled to 70% capacity. Place into a preheated oven.\n 4. Finished Product Display: Take the cake out of the oven, with a puffy exterior. Gently cut it open with a spoon, and the rich chocolate lava oozes out instantly (this is the climax of the video and must use the most attractive close-up).\n 5. Ending: Serve the cake with a scoop of ice cream, dust with powdered sugar, and enjoy it under warm lighting."
        },
        {
            "title": [
                "Personal Development",
                "Animated method, three ways to stop mental internal friction."
            ],
            "content": "Inspirational/Personal Growth Category (Taking 'How to Stop Mental Overconsumption' as an Example)\n・Video Type: Dynamic Text + Abstract Animation + Voiceover\n・Core Concept: Provide 3 specific and actionable methods to help the audience reduce overthinking and self-doubt.\n・Target Audience: Young people who feel anxious, stressed, and often criticize themselves.\n・Shot-by-Shot Prompt:\n 1. Opening: An abstract figure is trapped in a maze made of constantly spinning negative words (\"I can't do it\", \"What will others think\", \"What if I fail\").\n 2. Method 1: Thought Timing: A huge timer appears, set to 15 minutes. Voiceover: \"Give yourself a 'worry time'; once the time is up, resolutely stop.\" The figure in the screen actively turns off the noisy \"thought speaker\".\n 3. Method 2: Specificize the Problem: A messy ball of yarn (representing vague anxiety) is broken down into several clear, answerable yes/no questions. For example, \"What can I prepare for tomorrow's meeting?\" instead of \"Will I mess up tomorrow?\".\n 4. Method 3: Five-Minute Action: The figure is intimidated by a \"huge task\". At this point, a \"5-Minute Start\" button appears; after pressing it, the figure starts to act and finds that once they begin, the resistance becomes smaller.\n 5. Ending: The maze disappears, the figure stands on an open plain, and the sun shines down. Text appears: \"Thinking is all about problems; doing is the answer.\""
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
