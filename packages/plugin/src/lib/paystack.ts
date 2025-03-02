import https from "https";

import { SupportedCurrency } from "../utils/currencyCode";

const PAYSTACK_API_PATH = "https://api.paystack.co";

type HTTPMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "HEAD";

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

interface Request {
  path: string;
  method: HTTPMethod;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
}

export interface PaystackTransactionAuthorisation {
  reference: string;
  authorization_url: string;
  access_code: string;
}

export default class Paystack {
  apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  protected async requestPaystackAPI<T>(request: Request): Promise<T> {
    const path =
      request.path.replace(/\/$/, "") +
      "/?" +
      new URLSearchParams(request.query).toString();

    const options = {
      method: request.method,
      hostname: "api.paystack.co",
      port: 443,
      path,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, res => {
        let data: Uint8Array[] = [];

        res.on("data", chunk => {
          data.push(chunk);
        });

        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(data).toString()) as T);
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on("error", e => {
        reject(e);
      });

      if (request.body && Object.values(request.body).length > 0) {
        req.write(JSON.stringify(request.body));
      }

      req.end();
    });
  }

  transaction = {
    verify: ({ reference }: { reference: string }) =>
      this.requestPaystackAPI<
        PaystackResponse<{
          id: number;
          status: string;
          reference: string;
          amount: number;
          currency: string;
        }>
      >({
        path: "/transaction/verify/" + reference,
        method: "GET",
      }),
    get: ({ id }: { id: string }) =>
      this.requestPaystackAPI<
        PaystackResponse<{
          id: number;
          status: string;
          reference: string;
        }>
      >({
        path: "/transaction/" + id,
        method: "GET",
      }),
    initialize: ({
      amount,
      email,
      currency,
      reference,
      split_code,
    }: {
      amount: number;
      email?: string;
      currency?: SupportedCurrency;
      reference?: string;
      split_code?: string;
    }) =>
      this.requestPaystackAPI<
        PaystackResponse<{
          authorization_url: string;
          access_code: string;
          reference: string;
        }>
      >({
        path: "/transaction/initialize",
        method: "POST",
        body: {
          amount,
          email,
          currency,
          reference,
          split_code,
        },
      }),
  };

  refund = {
    create: ({
      transaction,
      amount,
    }: {
      transaction: number;
      amount: number;
    }) =>
      this.requestPaystackAPI<
        PaystackResponse<{
          id: number;
          status: string;
          reference: string;
          amount: number;
        }>
      >({
        path: "/refund",
        method: "POST",
        body: {
          transaction,
          amount,
        },
      }),
  };
}
