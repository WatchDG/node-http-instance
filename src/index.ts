import * as http from 'http';
import * as https from 'https';
import * as querystring from 'querystring';

import { ResultOk, ResultFail, ResultOK, ResultFAIL } from 'node-result';

type HttpInstanceOptions = {
  baseUrl: string;
  timeout?: number;
};

type HttpResponse = {
  status: number;
  headers: object;
  data?: object | string;
};

type HttpRequestOptions = {
  url: URL;
  options: http.RequestOptions | https.RequestOptions;
  data?: object;
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

  private request(options: HttpRequestOptions): Promise<ResultOK<HttpResponse> | ResultFAIL<Error>> {
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
          const headers = response.headers;
          const contentTypeHeader = headers['content-type'];
          if (!contentTypeHeader) {
            resolve(
              ResultOk({
                status,
                headers,
              }),
            );
          }
          const contentTypeMatch = contentTypeHeader!.match(/(?<contentType>[a-z]+\/[a-z]+).*/);
          const contentType = contentTypeMatch?.groups?.contentType;
          if (contentType !== 'application/json' && contentType !== 'text/plain' && contentType !== 'text/html') {
            resolve(ResultFail(new TypeError('Unsupported content type.')));
          }
          let buffer = Buffer.alloc(0);
          response.on(
            'data',
            (chunk) => (buffer = Buffer.concat([buffer, chunk], Buffer.byteLength(buffer) + Buffer.byteLength(chunk))),
          );
          response.on('end', () => {
            if (contentType === 'application/json') {
              resolve(
                ResultOk({
                  status,
                  headers,
                  data: JSON.parse(buffer.toString()),
                }),
              );
            }
            if (contentType === 'text/plain' || contentType === 'text/html') {
              resolve(
                ResultOk({
                  status,
                  headers,
                  data: buffer.toString(),
                }),
              );
            }
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

  get(path: string) {
    const url = new URL(path, this.url);
    return this.request({
      url,
      options: Object.assign(this.options, {
        method: 'GET',
      }),
    });
  }

  delete(path: string) {
    const url = new URL(path, this.url);
    return this.request({
      url,
      options: Object.assign(this.options, {
        method: 'DELETE',
      }),
    });
  }

  post(path: string, data: object) {
    const url = new URL(path, this.url);
    return this.request({
      url,
      options: Object.assign(this.options, {
        method: 'POST',
      }),
      data,
    });
  }

  put(path: string, data: object) {
    const url = new URL(path, this.url);
    return this.request({
      url,
      options: Object.assign(this.options, {
        method: 'PUT',
      }),
      data,
    });
  }
}
