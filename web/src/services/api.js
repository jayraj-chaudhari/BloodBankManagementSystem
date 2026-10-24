import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to inject JWT Bearer token on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bb_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle unauthenticated 401s
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Do not redirect or wipe storage if the 401 comes from the login request itself
    const isLoginEndpoint = error.config && error.config.url && error.config.url.includes('/auth/login');
    if (error.response && error.response.status === 401 && !isLoginEndpoint) {
      // If unauthorized, clear token
      localStorage.removeItem('bb_token');
      localStorage.removeItem('bb_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const message = error.response?.data?.error?.message || error.message || 'Network request failed';
    const code = error.response?.data?.error?.code || 'UNKNOWN_ERROR';
    return Promise.reject({ message, code, status: error.response?.status });
  }
);

// 1. Auth APIs
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  registerDonor: (data) => api.post('/auth/register-donor', data),
  getMe: () => api.get('/auth/me')
};

// 2. Inventory & Stock APIs
export const inventoryApi = {
  getInventory: () => api.get('/inventory'),
  getPublicInventory: () => api.get('/inventory/public'),
  getUnits: (params) => api.get('/units', { params }),
  updateUnitStatus: (unitId, status) => api.patch(`/units/${unitId}/status`, { status }),
  expireUnits: () => api.post('/admin/expire-units')
};

// 3. Donor APIs
export const donorApi = {
  getDonors: (params) => api.get('/donors', { params }),
  getDonorMe: () => api.get('/donors/me'),
  getDonorById: (id) => api.get(`/donors/${id}`),
  getDonorContact: (id) => api.get(`/donors/${id}/contact`),
  updateDonor: (id, data) => api.patch(`/donors/${id}`, data)
};

// 4. Donation APIs
export const donationApi = {
  getDonations: (params) => api.get('/donations', { params }),
  getDonationsMe: () => api.get('/donations/me'),
  createDonation: (data) => api.post('/donations', data)
};

// 5. Screening & Lab APIs
export const screeningApi = {
  getScreenings: (donationId) => api.get(`/screenings?donation_id=${donationId}`),
  createScreening: (data) => api.post('/screenings', data)
};

// 6. Blood Requests & Allocation APIs
export const requestApi = {
  getRequests: (params) => api.get('/requests', { params }),
  getRequestById: (id) => api.get(`/requests/${id}`),
  createRequest: (data) => api.post('/requests', data),
  allocateFEFO: (requestId) => api.post(`/requests/${requestId}/allocate`),
  updateStatus: (requestId, status) => api.patch(`/requests/${requestId}/status`, { status })
};

// 7. Emergency Alerts APIs
export const alertApi = {
  getAlertsForRequest: (requestId) => api.get(`/requests/${requestId}/alerts`),
  createAlerts: (requestId, radiusKm = 25, maxDonors = 10) =>
    api.post(`/requests/${requestId}/alerts`, { radius_km: radiusKm, max_donors: maxDonors }),
  getAlertsMe: () => api.get('/alerts/me'),
  respondAlert: (alertId, response) => api.post(`/alerts/${alertId}/respond`, { response })
};

// 8. Analytics APIs (9 queries)
export const analyticsApi = {
  getQuery: (name) => api.get(`/analytics/${name}`)
};

// 9. Audit Trail & Hash Chain APIs
export const auditApi = {
  getLogs: (params) => api.get('/audit', { params }),
  verifyChain: () => api.get('/audit/verify'),
  getAnomalies: () => api.get('/audit/anomalies')
};

// 10. Master Data APIs
export const masterApi = {
  getBranches: (params) => api.get('/branches', { params }),
  getHospitals: (params) => api.get('/hospitals', { params })
};

export default api;
