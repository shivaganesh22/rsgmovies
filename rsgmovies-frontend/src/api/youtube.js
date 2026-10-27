import apiClient from './client';

export const youtubeApi = {
  async getYoutubeInfo(url) {
    const res = await apiClient.get(`/react/youtube/info/?url=${encodeURIComponent(url)}`);
    return res.data;
  },

  async getYoutube(link) {
    const res = await apiClient.get(`/react/youtube/info/?url=${encodeURIComponent(link)}`);
    return res.data;
  },

  async getYoutubeProgress(downloadId) {
    const res = await apiClient.get(`/react/youtube/progress/?id=${downloadId}`);
    return res.data;
  },

  async getY2Mate(link) {
    const res = await apiClient.get(`/react/y2mate/?link=${encodeURIComponent(link)}`);
    return res.data;
  },

  async downloadY2Mate(link, vid) {
    const res = await apiClient.get(`/react/y2matedownload/?link=${encodeURIComponent(link)}&vid=${encodeURIComponent(vid)}`);
    return res.data;
  },

  async getYtMateInfo(url) {
    const res = await apiClient.get(`/react/ytmate/info/?url=${encodeURIComponent(url)}`);
    return res.data;
  },

  async convertYtMate(videoId, format, quality) {
    const res = await apiClient.get(
      `/react/ytmate/convert/?video_id=${encodeURIComponent(videoId)}&format=${encodeURIComponent(format)}&quality=${encodeURIComponent(quality)}`
    );
    return res.data;
  },
};

export default youtubeApi;
