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

export const bnbpaycheck = async (token: string, body: object) => {
  let error = null;

  const res = await fetch(`${WEBUI_API_BASE_URL}/bnbpay/check`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body)
  })
    .then(async (res) => {
      if (!res.ok) throw await res.json();
      return res.json();
    })
    .then((json) => {
      return json;
    })
    .catch((err) => {
      console.log(err);
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
}

