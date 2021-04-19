import * as http from 'http';
import * as https from 'https';
import { URL, URLSearchParams } from 'url';

import { ok } from 'node-result';
import type { TResultAsync } from 'node-result';

import { request, RequestResponse, HttpOptions } from 'http-instance-request';

type HttpInstanceOptions = {
  baseUrl: string;
  timeout?: number;
  headers?: { [key: string]: string };
  params?: { [key: string]: string };
};

type HttpResponse<DataType> = {
  status: number;
  headers: http.IncomingHttpHeaders;
  data?: DataType;
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
    if (options.params) {
      this.url.search = new URLSearchParams(options.params).toString();
    }
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
    url.search = baseUrl.searchParams.toString();
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

  private static bodyToData<DataType>(requestResponse: RequestResponse): HttpResponse<DataType> {
    const { status, headers, body } = requestResponse;
    const contentType = headers['content-type'];
    if (body && contentType) {
      if (contentType.includes('application/json')) return { status, headers, data: JSON.parse(body.toString()) };
      if (contentType.includes('html/text')) return { status, headers, data: (body.toString() as unknown) as DataType };
      if (contentType.includes('text/plain'))
        return {
          status,
          headers,
          data: (body.toString() as unknown) as DataType
        };
      return { status, headers };
    }
    return { status, headers };
  }

  async get<DataType>(path: string, options?: HttpMethodOptions): TResultAsync<HttpResponse<DataType>, Error> {
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
    return ok(HttpInstance.bodyToData<DataType>(requestResponse));
  }

  async delete<DataType>(path: string, options?: HttpMethodOptions): TResultAsync<HttpResponse<DataType>, Error> {
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
    return ok(HttpInstance.bodyToData<DataType>(requestResponse));
  }

  async post<DataType>(
    path: string,
    data?: Record<string, unknown> | string,
    options?: HttpMethodOptions
  ): TResultAsync<HttpResponse<DataType>, Error> {
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
    return ok(HttpInstance.bodyToData<DataType>(requestResponse));
  }

  async put<DataType>(
    path: string,
    data?: Record<string, unknown> | string,
    options?: HttpMethodOptions
  ): TResultAsync<HttpResponse<DataType>, Error> {
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
    return ok(HttpInstance.bodyToData<DataType>(requestResponse));
  }
}
