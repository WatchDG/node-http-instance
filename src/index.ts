import * as http from 'http';
import * as https from 'https';

import { ResultOk, ResultFail, ResultOK, ResultFAIL } from 'node-result';

type HttpInstanceOptions = {
  baseUrl: string;
  timeout?: number;
};

type HttpRequestOptions = {
  url: URL;
  options: http.RequestOptions | https.RequestOptions;
  data?: object;
};

type HttpResponse<Data> = {
  status: number;
  headers: object;
  data?: Data;
};

export class HttpInstance {
  private readonly url: URL;
  private readonly options: http.RequestOptions | https.RequestOptions;
  private readonly timeout: number;

  constructor(options: HttpInstanceOptions) {
    this.url = new URL(options.baseUrl);
    this.options = {
      headers: {
        Accept: 'application/json',
      },
    };
    this.timeout = options.timeout || 1000;
  }

  private request<Data>(options: HttpRequestOptions): Promise<ResultOK<HttpResponse<Data>> | ResultFAIL<Error>> {
    const url = options.url;
    const httpRequest: (
      url: URL,
      options: http.RequestOptions | https.RequestOptions,
      callback?: (response: http.IncomingMessage) => void,
    ) => http.ClientRequest = url.protocol === 'http:' ? http.request : https.request;
    return new Promise((resolve) => {
      try {
        const request = httpRequest(url, options.options, (response) => {
          const status = response.statusCode!;
          if (status < 200 || status >= 300) resolve(ResultFail(new Error(`Non success status code. ${status}`)));
          const headers = response.headers;
          const contentType = headers['content-type'];
          if (!contentType) {
            resolve(
              ResultOk({
                status,
                headers,
              }),
            );
          }
          if (!contentType!.includes('application/json')) {
            resolve(ResultFail(new TypeError('Unsupported content type.')));
          }
          let buffer = Buffer.alloc(0);
          response.on(
            'data',
            (chunk) => (buffer = Buffer.concat([buffer, chunk], Buffer.byteLength(buffer) + Buffer.byteLength(chunk))),
          );
          response.on('end', () => {
            resolve(
              ResultOk({
                status,
                headers,
                data: JSON.parse(buffer.toString()),
              }),
            );
          });
        });
        request.on('error', (error) => resolve(ResultFail(error)));
        request.setTimeout(this.timeout);
        if (typeof options.data === 'object') {
          const data = JSON.stringify(options.data);
          const dataLength = Buffer.byteLength(data);
          request.setHeader('Content-Type', 'application/json');
          request.setHeader('Content-Length', dataLength);
          request.write(data);
        }
        request.end();
      } catch (error) {
        resolve(ResultFail(error));
      }
    });
  }

  get<Data>(path: string) {
    const url = new URL(path, this.url);
    return this.request<Data>({
      url,
      options: Object.assign(this.options, {
        method: 'GET',
      }),
    });
  }

  delete<Data>(path: string) {
    const url = new URL(path, this.url);
    return this.request<Data>({
      url,
      options: Object.assign(this.options, {
        method: 'DELETE',
      }),
    });
  }

  post<Data>(path: string, data?: object) {
    const url = new URL(path, this.url);
    return this.request<Data>({
      url,
      options: Object.assign(this.options, {
        method: 'POST',
      }),
      data,
    });
  }

  put<Data>(path: string, data?: object) {
    const url = new URL(path, this.url);
    return this.request<Data>({
      url,
      options: Object.assign(this.options, {
        method: 'PUT',
      }),
      data,
    });
  }
}
