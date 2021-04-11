import fetch, { RequestInfo, RequestInit } from 'node-fetch';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HttpRequestService {
  async get<T = any>(
    url: RequestInfo,
    options?: RequestInit,
    type?: 'json',
  ): Promise<T>;
  async get(
    url: RequestInfo,
    options?: RequestInit,
    type?: 'text',
  ): Promise<string>;
  async get(
    url: RequestInfo,
    options?: RequestInit,
    type: 'json' | 'text' = 'json',
  ) {
    const response = await fetch(url, options);

    if (type === 'json') {
      const json = await response.json();

      return json;
    }

    const text = await response.text();

    return text;
  }
}
