import { ref } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3051'

export function useApi() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json'
    }
  })

  // Request interceptor to add auth token
  api.interceptors.request.use((config) => {
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  })

  // Response interceptor for error handling
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('API Error:', error)
      return Promise.reject(error)
    }
  )

  const request = async <T>(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    data?: any,
    config?: any
  ): Promise<T> => {
    try {
      loading.value = true
      error.value = null
      
      const response = await api.request({
        method,
        url,
        data,
        ...config
      })
      
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'An error occurred'
      throw err
    } finally {
      loading.value = false
    }
  }

  const get = <T>(url: string, config?: any) => request<T>('get', url, undefined, config)
  const post = <T>(url: string, data?: any, config?: any) => request<T>('post', url, data, config)
  const put = <T>(url: string, data?: any, config?: any) => request<T>('put', url, data, config)
  const del = <T>(url: string, config?: any) => request<T>('delete', url, undefined, config)

  return {
    api,
    loading,
    error,
    get,
    post,
    put,
    delete: del
  }
}