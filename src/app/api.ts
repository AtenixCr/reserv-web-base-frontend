import { environment } from '../environments/environment';
import { Injectable } from '@angular/core';
export class ApiFailure extends Error {
  constructor(readonly code: string, readonly fields: Record<string,string> = {}, readonly status = 0) { super(code); }
}
@Injectable({providedIn:'root'})
export class Api {
  private token: {headerName:string;token:string} | null = null;
  reset(): void { this.token = null; }
  async request<T>(path: string, method = 'GET', body?: unknown, extraHeaders: Record<string,string> = {}): Promise<T> {
    if (method !== 'GET' && !path.startsWith('/public/') && !this.token) this.token = await this.request('/auth/csrf');
    const headers: Record<string,string> = {'Content-Type':'application/json',...extraHeaders};
    if (method !== 'GET' && this.token) headers[this.token.headerName] = this.token.token;
    let response: Response;
    try { response = await fetch(environment.apiBaseUrl + path,{method,headers,credentials:'include',body:body === undefined ? undefined : JSON.stringify(body)}); }
    catch { throw new ApiFailure('NETWORK_ERROR'); }
    let data: unknown;
    try { data = await response.json(); } catch { throw new ApiFailure('NETWORK_ERROR'); }
    if (!response.ok) {
      const error = data as {code?:string;fieldErrors?:Record<string,string>};
      if (error.code === 'CSRF_INVALID') this.reset();
      throw new ApiFailure(error.code || 'UNEXPECTED_ERROR',error.fieldErrors || {},response.status);
    }
    return data as T;
  }
}
