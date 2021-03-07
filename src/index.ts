import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

import { ResultOk, ReturningResultAsync } from 'node-result';

import { request, RequestResponse, HttpOptions } from 'http-instance-request';

type HttpInstanceOptions = {
  baseUrl: string;
  timeout?: number;
  headers?: { [key: string]: string };
};

type HttpResponse<D> = {
  status: number;
  headers: http.IncomingHttpHeaders;
  data?: D;
};

type HttpMethodOptions = {
  headers?: { [key: string]: string };
  params?: { [key: string]: string };
};

type UrlObj = {
  baseUrl: URL;
  path: string;
};

type OptionObj = {
  method: 'GET' | 'DELETE' | 'POST' | 'PUT';
  options: HttpOptions;
  headers?: { [key: string]: string };
  params?: { [key: string]: string };
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

  private static prepareUrlAndOptions(
    urlObj: UrlObj,
    optionObj: OptionObj,
    body?: unknown
  ): {
    url: URL;
    options: HttpOptions;
    body: unknown;
  } {
    const { baseUrl, path } = urlObj;
    const url = new URL(path, baseUrl);
    const { method, options: httpOptions, params, headers } = optionObj;
    const options = Object.assign({ method }, httpOptions);
    if (params) for (const param of Object.keys(params)) url.searchParams.append(param, params[param]);
    if (headers) Object.assign(options.headers, headers);
    return { url, options, body };
  }

  private static prepareBody(data?: Record<string, unknown> | string) {
    if (typeof data === 'object') {
      const body = JSON.stringify(data);
      const contentType = 'application/json';
      const contentLength = Buffer.byteLength(body);
      return {
        headers: {
          'content-type': contentType,
          'content-length': contentLength
        },
        body
      };
    }
    if (typeof data === 'string') {
      const body = data;
      const contentType = 'text/plain';
      const contentLength = Buffer.byteLength(body);
      return {
        headers: {
          'content-type': contentType,
          'content-length': contentLength
        },
        body
      };
    }
    return { headers: {} };
  }

  private static bodyToData<D>(requestResponse: RequestResponse): HttpResponse<D> {
    const { status, headers, body } = requestResponse;
    const contentType = headers['content-type'];
    if (body && contentType) {
      if (contentType.includes('application/json')) return { status, headers, data: JSON.parse(body.toString()) };
      if (contentType.includes('html/text')) return { status, headers, data: (body.toString() as unknown) as D };
      return { status, headers };
    }
    return { status, headers };
  }

  async get<D>(path: string, options?: HttpMethodOptions): ReturningResultAsync<HttpResponse<D>, Error> {
    const urlAndOptions = HttpInstance.prepareUrlAndOptions(
      {
        baseUrl: this.url,
        path
      },
      {
        method: 'GET',
        options: this.options,
        headers: options?.headers,
        params: options?.params
      }
    );
    const requestResponse = (await request(urlAndOptions)).unwrap();
    return ResultOk(HttpInstance.bodyToData<D>(requestResponse));
  }

  async delete<D>(path: string, options?: HttpMethodOptions): ReturningResultAsync<HttpResponse<D>, Error> {
    const urlAndOptions = HttpInstance.prepareUrlAndOptions(
      {
        baseUrl: this.url,
        path
      },
      {
        method: 'DELETE',
        options: this.options,
        headers: options?.headers,
        params: options?.params
      }
    );
    const requestResponse = (await request(urlAndOptions)).unwrap();
    return ResultOk(HttpInstance.bodyToData<D>(requestResponse));
  }

  async post<D>(
    path: string,
    data?: Record<string, unknown> | string,
    options?: HttpMethodOptions
  ): ReturningResultAsync<HttpResponse<D>, Error> {
    const { headers, body } = HttpInstance.prepareBody(data);
    const urlAndOptions = HttpInstance.prepareUrlAndOptions(
      {
        baseUrl: this.url,
        path
      },
      {
        method: 'POST',
        options: this.options,
        headers: Object.assign(headers, options?.headers),
        params: options?.params
      },
      body
    );
    const requestResponse = (await request(urlAndOptions)).unwrap();
    return ResultOk(HttpInstance.bodyToData<D>(requestResponse));
  }

  async put<D>(
    path: string,
    data?: Record<string, unknown> | string,
    options?: HttpMethodOptions
  ): ReturningResultAsync<HttpResponse<D>, Error> {
    const { headers, body } = HttpInstance.prepareBody(data);
    const urlAndOptions = HttpInstance.prepareUrlAndOptions(
      {
        baseUrl: this.url,
        path
      },
      {
        method: 'PUT',
        options: this.options,
        headers: Object.assign(headers, options?.headers),
        params: options?.params
      },
      body
    );
    const requestResponse = (await request(urlAndOptions)).unwrap();
    return ResultOk(HttpInstance.bodyToData<D>(requestResponse));
  }
}
