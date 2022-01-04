import { IStudio } from 'src/interfaces';
import env from 'src/env';
import { APIRequest, IResponse } from './api-request';

export class StudioService extends APIRequest {
  me(headers?: { [key: string]: string }): Promise<IResponse<IStudio>> {
    return this.get('/studio/me', headers);
  }

  update(payload: any) {
    return this.put('/studio/update', payload);
  }

  updatePaymentInfo(payload): Promise<IResponse<IStudio>> {
    return this.post('/studio/bank-transfer/update', payload);
  }

  updateDirectDepost(payload): Promise<IResponse<IStudio>> {
    return this.post('/studio/direct-deposit/update', payload);
  }

  updatePaxum(payload): Promise<IResponse<IStudio>> {
    return this.post('/studio/paxum/update', payload);
  }

  updateBitpay(payload): Promise<IResponse<IStudio>> {
    return this.post('/studio/bitpay/update', payload);
  }

  getCommission() {
    return this.get('/settings/studio/commission');
  }

  addModel(payload) {
    return this.post('/studio/members', payload);
  }

  getMembers(params?: { [key: string]: string }) {
    return this.get(this.buildUrl('/studio/members', params));
  }

  getMemberCommissions(params?: { [key: string]: string }) {
    return this.get(this.buildUrl('/studio/commission', params));
  }

  updateMemberCommission(id: string, commission: number) {
    return this.put(`/studio/commission/member/${id}`, { commission });
  }

  getPerformerRequest(params?: { [key: string]: string }) {
    return this.get(
      this.buildUrl('/payout-requests/studio/performer-request', params)
    );
  }

  updateStatusPerformerRequest(id: string, payload) {
    return this.put(`/payout-requests/studio/update/${id}`, { ...payload });
  }

  updateMemberStatus(id: string, status: string) {
    return this.post(`/studio/members/${id}/active`, { status });
  }

  stats() {
    return this.get('/studio/stats');
  }

  getDocumentsUploadUrl() {
    return `${env.apiEndpoint}/studio/documents/upload`;
  }
}

export const studioService = new StudioService();
