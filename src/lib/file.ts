import env from 'src/env';
import { message } from 'antd';
import { RcFile } from 'antd/lib/upload';

export function beforeAvatarUpload(file: RcFile): boolean {
  const ext = file.name.split('.').pop().toLowerCase();
  const isImageAccept = env.imageAccept
    .split(',')
    .map((item: string) => item.trim())
    .indexOf(`.${ext}`);
  if (isImageAccept === -1) {
    message.error(`You can only upload ${env.imageAccept} file!`);
    return false;
  }

  const isLt2M = file.size / 1024 / 1024 < (env.maximumSizeUploadAvatar || 2);
  if (!isLt2M) {
    message.error(
      `Image must smaller than ${env.maximumSizeUploadAvatar || 2}MB!`
    );
    return false;
  }

  return true;
}
