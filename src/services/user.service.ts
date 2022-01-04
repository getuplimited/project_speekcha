import { IUser } from 'src/interfaces';
import { APIRequest, IResponse } from './api-request';
import env from '../env';

export class UserService extends APIRequest {
  me(headers?: { [key: string]: string }): Promise<IResponse<IUser>> {
    return this.get('/users/me', headers);
  }

  updateMe(payload: any) {
    return this.put('/users', payload);
  }

  getAvatarUploadUrl(userId?: string) {
    if (userId) {
      return `${env.apiEndpoint}/users/${userId}/avatar/upload`;
    }
    return `${env.apiEndpoint}/users/avatar/upload`;
  }

  search(query?: { [key: string]: any }) {
    return this.get(this.buildUrl('/users/search', query));
  }

  findById(id: string) {
    return this.get(`/users/view/${id}`);
  }
}

export const userService = new UserService();
