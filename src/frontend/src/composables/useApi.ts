import { ref } from 'vue'
import api from '../utils/axios'

export function useApi() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const request = async <T>(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    data?: any,
    config?: any
  ): Promise<T> => {
    try {
      loading.value = true
      error.value = null

      console.log(`[USE_API] ${method.toUpperCase()} ${url}`)

      const response = await api.request({
        method,
        url,
        data,
        ...config
      })

      console.log(`[USE_API] Response:`, response.data)
      return response.data
    } catch (err: any) {
      console.error(`[USE_API] Error for ${method.toUpperCase()} ${url}:`, err)
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