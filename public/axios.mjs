// 封装axios
import axios from '../node_modules/axios/index.js'

const axiosInstance = axios.create({
  baseURL: 'http://localhost:3000',
})
// axios 拦截器
// 请求拦截器
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default axiosInstance
