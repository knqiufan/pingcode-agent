<template>
  <el-card class="role-management">
    <template #header>
      <div class="card-header">
        <span>角色管理</span>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog">
          新增角色
        </el-button>
      </div>
    </template>

    <el-table :data="roles" stripe style="width: 100%" v-loading="loading">
      <el-table-column prop="display_name" label="角色名称" min-width="150" />
      <el-table-column prop="name" label="标识符" width="150" />
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column prop="is_system" label="系统角色" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.is_system" type="info" size="small">是</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="权限" min-width="200">
        <template #default="{ row }">
          <template v-if="rolePermissionsMap[row.id]?.length">
            <el-tag
              v-for="perm in rolePermissionsMap[row.id]"
              :key="perm.id"
              size="small"
              style="margin: 2px"
            >
              {{ perm.display_name }}
            </el-tag>
          </template>
          <span v-else class="no-perm-text">暂无权限</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" align="center" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" size="small" @click="editRole(row)">
            编辑
          </el-button>
          <el-button
            v-if="!row.is_system"
            text
            type="danger"
            size="small"
            @click="handleDeleteRole(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="!roles.length && !loading" class="empty-tip">暂无角色</div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑角色' : '新增角色'"
      width="600px"
    >
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="角色名称" prop="display_name">
          <el-input v-model="formData.display_name" placeholder="如：管理员" />
        </el-form-item>
        <el-form-item label="标识符" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="如：admin（英文标识）"
            :disabled="isEdit && editingRole?.is_system"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="2"
            placeholder="角色描述"
          />
        </el-form-item>
        <el-form-item label="分配权限">
          <el-checkbox-group v-model="formData.permissions">
            <el-checkbox
              v-for="perm in allPermissions"
              :key="perm.id"
              :label="perm.id"
              :value="perm.id"
            >
              {{ perm.display_name }}
            </el-checkbox>
          </el-checkbox-group>
          <div v-if="!allPermissions.length" class="no-perm-text">暂无可分配权限</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveRole">
          {{ isEdit ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import {
  getRoles,
  getPermissions,
  getRolePermissions,
  createRole,
  updateRole,
  deleteRole,
  type Role,
  type Permission,
} from '@/api/models'

const loading = ref(false)
const saving = ref(false)
const roles = ref<Role[]>([])
const allPermissions = ref<Permission[]>([])
const rolePermissionsMap = ref<Record<string, Permission[]>>({})

const dialogVisible = ref(false)
const isEdit = ref(false)
const editingRole = ref<Role | null>(null)
const formRef = ref<FormInstance>()

const formData = reactive({
  name: '',
  display_name: '',
  description: '',
  permissions: [] as string[],
})

const rules = {
  display_name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  name: [{ required: true, message: '请输入角色标识符', trigger: 'blur' }],
}

/** 加载角色列表 */
async function loadRoles() {
  loading.value = true
  try {
    const res = await getRoles()
    roles.value = res.data || []
    // 为每个角色加载权限
    await loadAllRolePermissions()
  } catch {
    console.error('加载角色失败')
  } finally {
    loading.value = false
  }
}

/** 加载所有权限 */
async function loadPermissions() {
  try {
    const res = await getPermissions()
    allPermissions.value = res.data || []
  } catch {
    console.error('加载权限失败')
  }
}

/** 为所有角色加载权限 */
async function loadAllRolePermissions() {
  const map: Record<string, Permission[]> = {}
  for (const role of roles.value) {
    try {
      const res = await getRolePermissions(role.id)
      map[role.id] = res.data || []
    } catch {
      map[role.id] = []
    }
  }
  rolePermissionsMap.value = map
}

/** 重置表单 */
function resetForm() {
  Object.assign(formData, {
    name: '',
    display_name: '',
    description: '',
    permissions: [],
  })
  editingRole.value = null
}

/** 打开新增对话框 */
function openCreateDialog() {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

/** 打开编辑对话框 */
function editRole(role: Role) {
  isEdit.value = true
  editingRole.value = role
  const perms = rolePermissionsMap.value[role.id] || []
  Object.assign(formData, {
    name: role.name,
    display_name: role.display_name,
    description: role.description || '',
    permissions: perms.map(p => p.id),
  })
  dialogVisible.value = true
}

/** 保存角色（创建/更新） */
async function saveRole() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const payload = {
      name: formData.name,
      display_name: formData.display_name,
      description: formData.description,
      permissions: formData.permissions,
    }

    if (isEdit.value && editingRole.value) {
      await updateRole(editingRole.value.id, payload)
      ElMessage.success('角色更新成功')
    } else {
      await createRole(payload)
      ElMessage.success('角色创建成功')
    }
    dialogVisible.value = false
    await loadRoles()
  } catch {
    // Error handled by interceptor
  } finally {
    saving.value = false
  }
}

/** 删除角色 */
async function handleDeleteRole(role: Role) {
  try {
    await ElMessageBox.confirm(`确定删除角色"${role.display_name}"吗？`, '确认删除', {
      type: 'warning',
    })
    await deleteRole(role.id)
    ElMessage.success('删除成功')
    await loadRoles()
  } catch {
    // User cancelled or error
  }
}

onMounted(() => {
  loadRoles()
  loadPermissions()
})
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.role-management {
  margin-bottom: $spacing-md;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-tip {
  padding: $spacing-lg;
  text-align: center;
  color: $text-tertiary;
  font-size: $font-size-sm;
}

.no-perm-text {
  color: $text-tertiary;
  font-size: $font-size-sm;
}
</style>
