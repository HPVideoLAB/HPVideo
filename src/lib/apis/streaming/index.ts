import { EventSourceParserStream } from 'eventsource-parser/stream';
import type { ParsedEvent } from 'eventsource-parser';

type TextStreamUpdate = {
	done: boolean;
	value: string;
	status?: string;
	limit?: any;
	paystatus?: boolean;
	paymoney?: string;
	createId?: string;
	error?: any;
};

// createOpenAITextStream takes a responseBody with a SSE response,
// and returns an async generator that emits delta updates with large deltas chunked into random sized chunks
export async function createOpenAITextStream(
	responseBody: ReadableStream<Uint8Array>,
	splitLargeDeltas: boolean
): Promise<AsyncGenerator<TextStreamUpdate>> {
	const eventStream = responseBody
		.pipeThrough(new TextDecoderStream())
		.pipeThrough(new EventSourceParserStream())
		.getReader();
	let iterator = openAIStreamToIterator(eventStream);
	if (splitLargeDeltas) {
		iterator = streamLargeDeltasAsRandomChunks(iterator);
	}
	return iterator;
}

async function* openAIStreamToIterator(
	reader: ReadableStreamDefaultReader<ParsedEvent>
): AsyncGenerator<TextStreamUpdate> {
	while (true) {
		const { value, done } = await reader.read();
		if (done) {
			yield { done: true, value: ''};
			break;
		}
		if (!value) {
			continue;
		}
		const data = value.data;
		if (data.startsWith('[DONE]')) {
			yield { done: true, value: '' };
			break;
		}

		try {
			const parsedData = JSON.parse(data);
			if (parsedData.success) {
				yield { done: false, value: parsedData.videos, limit: parsedData.limit, paystatus: parsedData.paystatus, paymoney: parsedData.paymoney, createId: parsedData.createId, status: parsedData.status };
			} else {
				yield { done: true, value: '', error: "error" };
				break;
			}
		} catch (e) {
			console.error('Error extracting delta from SSE event:', e);
		}
	}
}

// streamLargeDeltasAsRandomChunks will chunk large deltas (length > 5) into random sized chunks between 1-3 characters
// This is to simulate a more fluid streaming, even though some providers may send large chunks of text at once
async function* streamLargeDeltasAsRandomChunks(
	iterator: AsyncGenerator<TextStreamUpdate>
): AsyncGenerator<TextStreamUpdate> {
	for await (const textStreamUpdate of iterator) {
		if (textStreamUpdate.done) {
			yield textStreamUpdate;
			return;
		}
		let content = textStreamUpdate.value;
		let status = textStreamUpdate.status;
		let paystatus = textStreamUpdate.paystatus;
		let paymoney = textStreamUpdate.paymoney;
		let limit = textStreamUpdate.limit;
		let createId = textStreamUpdate.createId;
		yield { done: false, value: content, status: status, paystatus: paystatus, paymoney: paymoney, limit: limit, createId: createId };
		continue;
	}
}
