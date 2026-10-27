import apiClient from './client';

export const seedrApi = {
  async getFiles() {
    const res = await apiClient.get('/react/files/');
    return res.data;
  },

  async openFolder(id) {
    const res = await apiClient.get(`/react/open/${id}`);
    return res.data;
  },

  async getFile(id) {
    const res = await apiClient.get(`/react/file/${id}`);
    return res.data;
  },

  async getFolderFile(id) {
    const res = await apiClient.get(`/react/folder/file/${id}`);
    return res.data;
  },

  async getFilePlayer(id) {
    const res = await apiClient.get(`/react/file/player/${id}`);
    return res.data;
  },

  async getFolderFilePlayer(id) {
    const res = await apiClient.get(`/react/folder/file/player/${id}`);
    return res.data;
  },

  async addTorrent(link) {
    const res = await apiClient.post(`/react/addtorrent/?link=${encodeURIComponent(link)}`, { link });
    return res.data;
  },

  async deleteTorrent(id, name = '') {
    const res = await apiClient.delete(`/react/deletetorrent/${id}${name ? `?name=${encodeURIComponent(name)}` : ''}`);
    return res.data;
  },

  async deleteFolder(id, name = '') {
    const res = await apiClient.delete(`/react/deletefolder/${id}${name ? `?name=${encodeURIComponent(name)}` : ''}`);
    return res.data;
  },

  async deleteFile(id, name = '') {
    const res = await apiClient.delete(`/react/deletefile/${id}${name ? `?name=${encodeURIComponent(name)}` : ''}`);
    return res.data;
  },

  async renameFolder(id, name) {
    const res = await apiClient.post(`/react/rename/folder/${id}/?name=${encodeURIComponent(name)}`, { name });
    return res.data;
  },

  async renameFile(id, name) {
    const res = await apiClient.post(`/react/rename/file/${id}/?name=${encodeURIComponent(name)}`, { name });
    return res.data;
  },

  async folderArchive(id) {
    const res = await apiClient.get(`/react/folder/archive/${id}`);
    return res.data;
  },

  async lockFolder(id) {
    const res = await apiClient.get(`/react/lock/folder/${id}/`);
    return res.data;
  },

  async addFolder(name) {
    const res = await apiClient.post(`/react/addfolder/?name=${encodeURIComponent(name)}`, { name });
    return res.data;
  },

  async searchFiles(query) {
    const res = await apiClient.get(`/react/files/search/?q=${encodeURIComponent(query)}`);
    return res.data;
  },
};

export default seedrApi;
