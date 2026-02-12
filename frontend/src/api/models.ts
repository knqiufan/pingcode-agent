import request from './index'
import type { ApiResponse } from './types'

/** 模型配置 */
export interface ModelConfig {
  id: string
  user_id: string
  name: string
  provider: 'openai' | 'anthropic'
  api_key: string
  base_url?: string
  model: string
  temperature?: number
  max_tokens?: number
  is_default: boolean
  createdAt: string
  updatedAt: string
}

/** 创建/更新模型配置请求 */
export interface ModelConfigRequest {
  name: string
  provider: 'openai' | 'anthropic'
  api_key: string
  base_url?: string
  model: string
  temperature?: number
  max_tokens?: number
  is_default?: boolean
}

/** 获取所有模型配置 */
export function getModelConfigs() {
  return request.get<any, ApiResponse<ModelConfig[]>>('/api/models')
}

/** 获取默认模型配置 */
export function getDefaultModelConfig() {
  return request.get<any, ApiResponse<ModelConfig>>('/api/models/default')
}

/** 获取单个模型配置 */
export function getModelConfig(id: string) {
  return request.get<any, ApiResponse<ModelConfig>>(`/api/models/${id}`)
}

/** 创建模型配置 */
export function createModelConfig(data: ModelConfigRequest) {
  return request.post<any, ApiResponse<ModelConfig>>('/api/models', data)
}

/** 更新模型配置 */
export function updateModelConfig(id: string, data: Partial<ModelConfigRequest>) {
  return request.put<any, ApiResponse<ModelConfig>>(`/api/models/${id}`, data)
}

/** 删除模型配置 */
export function deleteModelConfig(id: string) {
  return request.delete<any, ApiResponse<null>>(`/api/models/${id}`)
}

/** 测试模型连接 */
export function testModelConfig(id: string) {
  return request.post<any, ApiResponse<null>>(`/api/models/${id}/test`)
}

// ===== 角色和权限 API =====

/** 角色 */
export interface Role {
  id: string
  name: string
  display_name: string
  description?: string
  is_system: boolean
  createdAt: string
  updatedAt: string
}

/** 权限 */
export interface Permission {
  id: string
  name: string
  display_name: string
  description?: string
  resource: string
  action: string
}

/** 获取所有角色 */
export function getRoles() {
  return request.get<any, ApiResponse<Role[]>>('/api/roles')
}

/** 创建角色 */
export function createRole(data: Partial<Role> & { permissions?: string[] }) {
  return request.post<any, ApiResponse<Role>>('/api/roles', data)
}

/** 更新角色 */
export function updateRole(id: string, data: Partial<Role> & { permissions?: string[] }) {
  return request.put<any, ApiResponse<Role>>(`/api/roles/${id}`, data)
}

/** 删除角色 */
export function deleteRole(id: string) {
  return request.delete<any, ApiResponse<null>>(`/api/roles/${id}`)
}

/** 获取角色权限 */
export function getRolePermissions(roleId: string) {
  return request.get<any, ApiResponse<Permission[]>>(`/api/roles/${roleId}/permissions`)
}

/** 获取所有权限 */
export function getPermissions() {
  return request.get<any, ApiResponse<Permission[]>>('/api/roles/permissions')
}

/** 创建权限 */
export function createPermission(data: Partial<Permission>) {
  return request.post<any, ApiResponse<Permission>>('/api/roles/permissions', data)
}

// ===== 用户管理 API =====

/** 用户信息 */
export interface UserInfo {
  id: string
  username: string
  pingcode_display_name?: string
  pingcode_email?: string
  createdAt: string
  roles?: string[]
}

/** 获取用户列表 */
export function getUsers(params?: { page?: number; pageSize?: number; search?: string }) {
  return request.get<any, ApiResponse<{ list: UserInfo[]; total: number; page: number; pageSize: number }>>('/api/users', { params })
}

/** 获取用户详情 */
export function getUser(id: string) {
  return request.get<any, ApiResponse<UserInfo>>(`/api/users/${id}`)
}

/** 创建用户 */
export function createUser(data: { username: string; password: string; email?: string }) {
  return request.post<any, ApiResponse<{ id: string; username: string }>>('/api/users', data)
}

/** 更新用户 */
export function updateUser(id: string, data: { username?: string; email?: string; roles?: string[] }) {
  return request.put<any, ApiResponse<null>>(`/api/users/${id}`, data)
}

/** 删除用户 */
export function deleteUser(id: string) {
  return request.delete<any, ApiResponse<null>>(`/api/users/${id}`)
}
