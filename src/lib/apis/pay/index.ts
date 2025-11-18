import { WEBUI_API_BASE_URL } from '$lib/constants';

export const x402pay = async (address: string, model: string, size: string, duration: number, messageid: string) => {
  const response = await fetch(`${WEBUI_API_BASE_URL}/x402/creator?address=${address}&model=${model}&size=${size}&duration=${duration}&messageid=${messageid}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response;
}

