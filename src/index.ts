import * as http from 'http';
import * as https from 'https';
import * as querystring from 'querystring';

import { ResultOk, ResultFail, ResultOK, ResultFAIL } from 'node-result';

type HttpInstanceOptions = {
  baseURL: string;
  params?: Record<string, any>;
};

type HttpResponse = {
  status: number;
  headers: object;
  data?: object | string;
};

function _request(
  protocol: string,
  options: http.RequestOptions | https.RequestOptions,
): Promise<ResultOK<HttpResponse> | ResultFAIL<Error>> {
  const fn: (
    options: http.RequestOptions | https.RequestOptions,
    callback?: (response: http.IncomingMessage) => void,
  ) => http.ClientRequest = protocol === 'http:' ? http.request : https.request;
  return new Promise((resolve) => {
    try {
      const request = fn(options, (response) => {
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
      request.end();
    } catch (error) {
      resolve(ResultFail(error));
    }
  });
}

export class HttpInstance {
  private readonly url;
  private readonly options: object;
  private readonly params?;

  constructor(options: HttpInstanceOptions) {
    this.url = new URL(options.baseURL);
    if (options.params && Object.keys(options.params).length > 0) {
      this.params = options.params;
    }
    this.options = {
      hostname: this.url.hostname,
      headers: {
        Accept: 'application/json,text/plain,text/html',
      },
    };
  }

  get(path: string) {
    let totalPath = (this.url.pathname + path).replace(/\/{2,}/, '/');
    if (!!this.params) {
      totalPath += '?' + querystring.stringify(this.params);
    }
    return _request(
      this.url.protocol,
      Object.assign(this.options, {
        method: 'GET',
        path: totalPath,
      }),
    );
  }
}
