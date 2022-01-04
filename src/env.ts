export default {
  apiEndpoint: 'https://api.speekcha.com',
  socketEndpoint: 'https://api.speekcha.com',
  debug: process.env.NODE_ENV === 'development',
  maxVideoBitrateKbps: 900,
  imageAccept: '.jpeg, .jpg, .png',
  maximumSizeUploadAvatar: 2
};
