import apiClient from './client';

export const adminApi = {
  // Users Management
  async getUsers(params = {}) {
    const res = await apiClient.get('/api/admin/users/', { params });
    return res.data;
  },

  async getUser(id) {
    const res = await apiClient.get(`/api/admin/users/${id}/`);
    return res.data;
  },

  async updateUser(id, data) {
    const res = await apiClient.patch(`/api/admin/users/${id}/`, data);
    return res.data;
  },

  async revokeSession(id) {
    const res = await apiClient.post(`/api/admin/users/${id}/revoke-session/`);
    return res.data;
  },

  // Seedr Accounts Management
  async getSeedrAccounts() {
    const res = await apiClient.get('/api/admin/seedr-accounts/');
    return res.data;
  },

  async createSeedrAccount(data) {
    const res = await apiClient.post('/api/admin/seedr-accounts/', data);
    return res.data;
  },

  async updateSeedrAccount(id, data) {
    const res = await apiClient.patch(`/api/admin/seedr-accounts/${id}/`, data);
    return res.data;
  },

  async deleteSeedrAccount(id) {
    const res = await apiClient.delete(`/api/admin/seedr-accounts/${id}/`);
    return res.data;
  },

  async testSeedrAccount(id) {
    const res = await apiClient.post(`/api/admin/seedr-accounts/${id}/test/`);
    return res.data;
  },

  async setDefaultSeedrAccount(id) {
    const res = await apiClient.post(`/api/admin/seedr-accounts/${id}/set-default/`);
    return res.data;
  },

  // Activity & Security Logs
  async getActivityLogs(params = {}) {
    const res = await apiClient.get('/api/admin/activity-logs/', { params });
    return res.data;
  },

  async getActivityLogSettings() {
    const res = await apiClient.get('/api/admin/activity-logs/settings/');
    return res.data;
  },

  async updateActivityLogSettings(data) {
    const res = await apiClient.post('/api/admin/activity-logs/settings/', data);
    return res.data;
  },

  async clearActivityLogs() {
    const res = await apiClient.delete('/api/admin/activity-logs/clear/');
    return res.data;
  },

  // Maintenance Mode
  async getMaintenance() {
    const res = await apiClient.get('/api/admin/maintenance/');
    return res.data;
  },

  async updateMaintenance(data) {
    const res = await apiClient.post('/api/admin/maintenance/', data);
    return res.data;
  },

  // System Health
  async getSystemHealth() {
    const res = await apiClient.get('/api/admin/system-health/');
    return res.data;
  },
};

export default adminApi;
