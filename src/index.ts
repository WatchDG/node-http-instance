import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

import { ResultOk, ResultFail, ResultOK, ResultFAIL } from 'node-result';

type HttpInstanceOptions = {
  baseUrl: string;
  timeout?: number;
  headers?: { [key: string]: string };
};

type HttpRequestOptions = {
  url: URL;
  options: http.RequestOptions | https.RequestOptions;
  data?: { [key: string]: unknown } | string;
};

type HttpResponse<Data> = {
  status: number;
  headers: http.IncomingHttpHeaders;
  data?: Data;
};

type HttpMethodOptions = {
  headers?: { [key: string]: string };
};

export class HttpInstance {
  private readonly url: URL;
  private readonly options: (http.RequestOptions | https.RequestOptions) & { headers: { [Key: string]: string } };
  private readonly timeout: number;

  constructor(options: HttpInstanceOptions) {
    this.url = new URL(options.baseUrl);
    this.options = {
      headers: Object.assign(
        {
          Accept: 'application/json'
        },
        options.headers
      )
    };
    this.timeout = options.timeout ?? 1000;
  }

  private request<Data>(options: HttpRequestOptions): Promise<ResultOK<HttpResponse<Data>> | ResultFAIL<Error>> {
    const url = options.url;
    const httpRequest = url.protocol === 'http:' ? http.request : https.request;
    return new Promise((resolve) => {
      try {
        const request = httpRequest(url, options.options, (response) => {
          const status = response.statusCode;
          if (status) {
            if (status < 200 || status >= 300) resolve(ResultFail(new Error(`Non success status code. ${status}`)));
            const headers = response.headers;
            const contentType = headers['content-type'];
            if (contentType) {
              if (contentType.includes('application/json')) {
                let buffer = Buffer.alloc(0);
                response.on(
                  'data',
                  (chunk) =>
                    (buffer = Buffer.concat([buffer, chunk], Buffer.byteLength(buffer) + Buffer.byteLength(chunk)))
                );
                response.on('end', () => {
                  resolve(
                    ResultOk({
                      status,
                      headers,
                      data: JSON.parse(buffer.toString())
                    })
                  );
                });
              } else {
                resolve(ResultFail(new TypeError('Unsupported content type.')));
              }
            } else {
              resolve(
                ResultOk<HttpResponse<Data>>({
                  status,
                  headers
                })
              );
            }
          } else {
            resolve(ResultFail(new Error('Unknown status code.')));
          }
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
        if (typeof options.data === 'string') {
          const dataLength = Buffer.byteLength(options.data);
          const contentType = this.options.headers['Content-Type'] ?? 'text/plain';
          request.setHeader('Content-Type', contentType);
          request.setHeader('Content-Length', dataLength);
          request.write(options.data);
        }
        request.end();
      } catch (error) {
        resolve(ResultFail(error));
      }
    });
  }

  get<Data>(path: string, options?: HttpMethodOptions): Promise<ResultOK<HttpResponse<Data>> | ResultFAIL<Error>> {
    const url = new URL(path, this.url);
    const requestOptions = Object.assign({}, this.options, { method: 'GET' });
    if(options && options.headers){
      Object.assign(requestOptions.headers, options.headers);
    }
    return this.request<Data>({
      url,
      options: requestOptions
    });
  }

  delete<Data>(path: string, options?: HttpMethodOptions): Promise<ResultOK<HttpResponse<Data>> | ResultFAIL<Error>> {
    const url = new URL(path, this.url);
    const requestOptions = Object.assign({}, this.options, { method: 'DELETE' });
    if(options && options.headers){
      Object.assign(requestOptions.headers, options.headers);
    }
    return this.request<Data>({
      url,
      options: requestOptions
    });
  }

  post<Data>(
    path: string,
    data?: { [Key: string]: unknown },
    options?: HttpMethodOptions
  ): Promise<ResultOK<HttpResponse<Data>> | ResultFAIL<Error>> {
    const url = new URL(path, this.url);
    const requestOptions = Object.assign({}, this.options, { method: 'POST' });
    if(options && options.headers){
      Object.assign(requestOptions.headers, options.headers);
    }
    return this.request<Data>({
      url,
      options: requestOptions,
      data
    });
  }

  put<Data>(
    path: string,
    data?: { [Key: string]: unknown },
    options?: HttpMethodOptions
  ): Promise<ResultOK<HttpResponse<Data>> | ResultFAIL<Error>> {
    const url = new URL(path, this.url);
    const requestOptions = Object.assign({}, this.options, { method: 'PUT' });
    if(options && options.headers){
      Object.assign(requestOptions.headers, options.headers);
    }
    return this.request<Data>({
      url,
      options: requestOptions,
      data
    });
  }
}
