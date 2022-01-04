import { APIRequest } from './api-request';

export class TokenPackageService extends APIRequest {
  search(params?: { [key: string]: string }) {
    return this.get(this.buildUrl('/package/token/search', params));
  }

  buyTokens(id: string, body?: any) {
    return this.post(`/payment/purchase-tokens/${id}`, body);
  }

  ppReturn(body) {
    return this.post('/payment/paypal/return', body);
  }
}

export const tokenPackageService = new TokenPackageService();
