import axios from 'axios';

// Base API URL with environment fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bb_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Fallback mock data matching Hope UI presentation for smooth offline/dev experience
export const fallbackData = {
  stats: {
    totalUnits: 1420,
    activeDonors: 850,
    pendingRequests: 28,
    completedTransfusions: 3842,
    lifetimeUnitsMl: 405012300,
    yoyGrowth: 24,
  },
  chartTrends: [
    { name: 'Jan', collected: 92, dispatched: 68 },
    { name: 'Feb', collected: 78, dispatched: 56 },
    { name: 'Mar', collected: 90, dispatched: 72 },
    { name: 'Apr', collected: 74, dispatched: 54 },
    { name: 'Jun', collected: 91, dispatched: 69 },
    { name: 'Jul', collected: 76, dispatched: 58 },
    { name: 'Aug', collected: 90, dispatched: 72 },
  ],
  bloodGroups: [
    { group: 'O+', units: 480, status: 'Optimal', color: 'bg-emerald-500', percentage: 78 },
    { group: 'A+', units: 320, status: 'Adequate', color: 'bg-blue-500', percentage: 65 },
    { group: 'B+', units: 290, status: 'Adequate', color: 'bg-indigo-500', percentage: 58 },
    { group: 'AB+', units: 140, status: 'Low', color: 'bg-amber-500', percentage: 42 },
    { group: 'O-', units: 65, status: 'Critical', color: 'bg-red-500', percentage: 22 },
    { group: 'A-', units: 50, status: 'Critical', color: 'bg-red-500', percentage: 18 },
    { group: 'B-', units: 45, status: 'Critical', color: 'bg-red-500', percentage: 15 },
    { group: 'AB-', units: 30, status: 'Urgent', color: 'bg-rose-600', percentage: 10 },
  ],
  urgentRequests: [
    {
      id: 'REQ-9042',
      hospital: 'City Civil Hospital',
      blood_group: 'O-',
      component: 'RED_CELLS',
      units_needed: 4,
      urgency: 'CRITICAL',
      status: 'PENDING',
      created_at: '10 mins ago',
      contact: '+91 98251 10022'
    },
    {
      id: 'REQ-9041',
      hospital: 'Apollo Trauma Centre',
      blood_group: 'AB-',
      component: 'PLATELETS',
      units_needed: 2,
      urgency: 'HIGH',
      status: 'ALLOCATING',
      created_at: '25 mins ago',
      contact: '+91 98251 10033'
    },
    {
      id: 'REQ-9039',
      hospital: 'Sunshine Heart Institute',
      blood_group: 'A+',
      component: 'WHOLE_BLOOD',
      units_needed: 6,
      urgency: 'NORMAL',
      status: 'DISPATCHED',
      created_at: '1 hour ago',
      contact: '+91 98251 10044'
    },
    {
      id: 'REQ-9038',
      hospital: 'Sterling Multi-Specialty',
      blood_group: 'B+',
      component: 'PLASMA',
      units_needed: 3,
      urgency: 'NORMAL',
      status: 'FULFILLED',
      created_at: '3 hours ago',
      contact: '+91 98251 10055'
    }
  ],
  donors: [
    {
      id: 'DON-101',
      name: 'Rajesh Sharma',
      email: 'rajesh.sharma@example.com',
      phone: '+91 98765 43210',
      blood_group: 'O+',
      donations: 8,
      last_donated: '2026-08-14',
      status: 'Eligible',
      city: 'Surat'
    },
    {
      id: 'DON-102',
      name: 'Pooja Patel',
      email: 'pooja.patel@example.com',
      phone: '+91 98234 56789',
      blood_group: 'A+',
      donations: 5,
      last_donated: '2026-09-02',
      status: 'Eligible',
      city: 'Ahmedabad'
    },
    {
      id: 'DON-103',
      name: 'Vikram Mehta',
      email: 'vikram.mehta@example.com',
      phone: '+91 98987 11223',
      blood_group: 'B+',
      donations: 12,
      last_donated: '2026-10-18',
      status: 'Cooling Off (45d left)',
      city: 'Vadodara'
    },
    {
      id: 'DON-104',
      name: 'Ananya Desai',
      email: 'ananya.desai@example.com',
      phone: '+91 97123 44556',
      blood_group: 'AB-',
      donations: 3,
      last_donated: '2026-07-29',
      status: 'Eligible',
      city: 'Surat'
    }
  ]
};

// API Methods connecting with backend
export const BloodBankApi = {
  // Check backend server health
  checkHealth: async () => {
    try {
      const res = await apiClient.get('/health');
      return { isLive: true, data: res.data };
    } catch (err) {
      return { isLive: false, error: err.message };
    }
  },

  // Auth: Login
  login: async (email, password) => {
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      if (res.data?.data?.token) {
        localStorage.setItem('bb_token', res.data.data.token);
        localStorage.setItem('bb_user', JSON.stringify(res.data.data.user));
      }
      return { success: true, data: res.data.data };
    } catch (err) {
      // Mock login for frontend preview
      const mockUser = {
        email,
        full_name: email.split('@')[0].toUpperCase(),
        role_name: email.includes('admin') ? 'admin' : 'bb_officer',
        token: 'mock-jwt-token-preview',
      };
      localStorage.setItem('bb_token', mockUser.token);
      localStorage.setItem('bb_user', JSON.stringify(mockUser));
      return { success: true, data: { user: mockUser, isFallback: true } };
    }
  },

  // Auth: Register Donor
  registerDonor: async (donorData) => {
    try {
      const res = await apiClient.post('/auth/register-donor', donorData);
      return { success: true, data: res.data };
    } catch (err) {
      return {
        success: true,
        isFallback: true,
        data: {
          data: {
            user_id: 'usr_' + Date.now(),
            donor_id: 'dn_' + Date.now(),
            ...donorData
          }
        }
      };
    }
  },

  // Inventory: Public & Authenticated
  getInventory: async () => {
    try {
      const res = await apiClient.get('/inventory/public');
      if (res.data?.data && res.data.data.length > 0) {
        return { isLive: true, data: res.data.data };
      }
      return { isLive: false, data: fallbackData.bloodGroups };
    } catch (err) {
      return { isLive: false, data: fallbackData.bloodGroups };
    }
  },

  // Requests: List & Create
  getRequests: async () => {
    try {
      const res = await apiClient.get('/requests');
      if (res.data?.data && res.data.data.length > 0) {
        return { isLive: true, data: res.data.data };
      }
      return { isLive: false, data: fallbackData.urgentRequests };
    } catch (err) {
      return { isLive: false, data: fallbackData.urgentRequests };
    }
  },

  createRequest: async (payload) => {
    try {
      const res = await apiClient.post('/requests', payload);
      return { success: true, data: res.data };
    } catch (err) {
      return {
        success: true,
        isFallback: true,
        data: {
          id: 'REQ-' + Math.floor(1000 + Math.random() * 9000),
          created_at: 'Just now',
          status: 'PENDING',
          ...payload
        }
      };
    }
  },

  // Donors: List
  getDonors: async () => {
    try {
      const res = await apiClient.get('/donors');
      if (res.data?.data && res.data.data.length > 0) {
        return { isLive: true, data: res.data.data };
      }
      return { isLive: false, data: fallbackData.donors };
    } catch (err) {
      return { isLive: false, data: fallbackData.donors };
    }
  },

  // Analytics: Stock Running Total
  getAnalyticsStock: async () => {
    try {
      const res = await apiClient.get('/analytics/stock-running-total');
      return { isLive: true, data: res.data.data };
    } catch (err) {
      return { isLive: false, data: fallbackData.chartTrends };
    }
  }
};
