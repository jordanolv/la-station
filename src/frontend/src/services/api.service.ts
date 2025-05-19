import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Type pour les méthodes HTTP
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

/**
 * Service API principal - Responsable des appels HTTP de base
 * Respecte le principe de responsabilité unique
 */
class ApiService {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.API_URL || 'http://localhost:3002',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Configuration des intercepteurs
    this.setupInterceptors();
  }
  
  /**
   * Configure les intercepteurs pour les requêtes et réponses
   */
  private setupInterceptors(): void {
    // Intercepteur de requête pour ajouter le token d'authentification
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Intercepteur de réponse pour gérer les erreurs globales
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Log centralisé des erreurs
        console.error('API Error:', error.response || error.message || error);
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Méthode générique pour faire des requêtes HTTP
   */
  public async request<T = any>(
    method: HttpMethod,
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client({
        method,
        url: endpoint,
        data,
        ...config
      });
      
      return response.data;
    } catch (error) {
      console.error(`API Error (${method.toUpperCase()} ${endpoint}):`, error);
      throw error;
    }
  }
  
  // Méthodes helper pour faciliter les appels API
  public async get<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('get', endpoint, null, config);
  }
  
  public async post<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('post', endpoint, data, config);
  }
  
  public async put<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('put', endpoint, data, config);
  }
  
  public async patch<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('patch', endpoint, data, config);
  }
  
  public async delete<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('delete', endpoint, null, config);
  }
}

// Export une instance singleton pour assurer que tous les composants utilisent la même instance
export const apiService = new ApiService(); 