import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ensureFreshToken } from '../middleware/tokenRefresh.js';
import {
  getProjects,
  getWorkItems,
  getMyself,
  getWorkItemTypes,
  getWorkItemStates,
  getWorkItemProperties,
  getWorkItemPriorities,
} from '../services/pingcode.js';
import { seekdbClient } from '../services/db.js';
import {
  WorkItemType,
  WorkItemState,
  WorkItemProperty,
  WorkItemPriority,
  SyncedProject,
  SyncedWorkItem,
} from '../models/index.js';
import { success } from '../utils/response.js';
import { appConfig } from '../config/index.js';

const router = express.Router();
const { syncWorkItemBatchSize, syncBatchDelayMs } = appConfig.seekdb;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function chunk(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

const CONCURRENCY_LIMIT = 3;

/** 有限并发执行一组异步任务 */
async function runWithConcurrency(tasks, limit) {
  const results = [];
  let index = 0;

  async function runNext() {
    const i = index++;
    if (i >= tasks.length) return;
    results[i] = await tasks[i]();
    await runNext();
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => runNext()));
  return results;
}

/** 确保元数据表有数据：增量更新元数据 */
async function ensureMetadata(userId, accessToken, domain, projectList) {
  console.log('[Sync] 开始增量同步元数据...');

  const [existingTypes, existingStates, existingProperties, existingPriorities] = await Promise.all([
    WorkItemType.findAll({ where: { user_id: userId }, attributes: ['id', 'project_id'] }),
    WorkItemState.findAll({ where: { user_id: userId }, attributes: ['id', 'project_id', 'work_item_type_id'] }),
    WorkItemProperty.findAll({ where: { user_id: userId }, attributes: ['id', 'project_id', 'work_item_type_id'] }),
    WorkItemPriority.findAll({ where: { user_id: userId }, attributes: ['id', 'project_id'] }),
  ]);

  const existingTypeIds = new Set(existingTypes.map(t => `${t.project_id}:${t.id}`));
  const existingStateIds = new Set(existingStates.map(s => `${s.project_id}:${s.work_item_type_id}:${s.id}`));
  const existingPropertyIds = new Set(existingProperties.map(p => `${p.project_id}:${p.work_item_type_id}:${p.id}`));
  const existingPriorityIds = new Set(existingPriorities.map(p => `${p.project_id}:${p.id}`));

  const tasks = projectList.map((proj) => () =>
    fetchAndStoreMetadataForProject(
      userId, accessToken, domain, proj.id,
      existingTypeIds, existingStateIds, existingPropertyIds, existingPriorityIds,
    )
  );

  const allCounts = await runWithConcurrency(tasks, CONCURRENCY_LIMIT);
  const totals = allCounts.reduce(
    (acc, c) => ({
      types: acc.types + (c?.types || 0),
      states: acc.states + (c?.states || 0),
      properties: acc.properties + (c?.properties || 0),
      priorities: acc.priorities + (c?.priorities || 0),
    }),
    { types: 0, states: 0, properties: 0, priorities: 0 }
  );

  console.log(`[Sync] 元数据增量同步完成：+${totals.types} types, +${totals.states} states, +${totals.properties} properties, +${totals.priorities} priorities`);
}

async function fetchAndStoreMetadataForProject(
  userId, accessToken, domain, projectId,
  existingTypeIds, existingStateIds, existingPropertyIds, existingPriorityIds
) {
  const counts = { types: 0, states: 0, properties: 0, priorities: 0 };

  const typesRes = await getWorkItemTypes(accessToken, projectId, domain);
  const typeList = Array.isArray(typesRes) ? typesRes : (typesRes?.values || []);

  // 批量收集新类型
  const newTypes = typeList.filter(t => !existingTypeIds.has(`${projectId}:${t.id}`));
  if (newTypes.length > 0) {
    await WorkItemType.bulkCreate(
      newTypes.map(t => ({
        id: t.id, project_id: projectId, user_id: userId,
        name: t.name || t.id, group: t.group || '',
      })),
      { ignoreDuplicates: true }
    );
    newTypes.forEach(t => existingTypeIds.add(`${projectId}:${t.id}`));
    counts.types = newTypes.length;
  }

  // 并行拉取每个类型的 states 和 properties
  const statesBatch = [];
  const propsBatch = [];

  await Promise.all(typeList.map(async (t) => {
    const [statesRes, propsRes] = await Promise.all([
      getWorkItemStates(accessToken, projectId, t.id, domain),
      getWorkItemProperties(accessToken, projectId, t.id, domain),
    ]);
    const stateList = Array.isArray(statesRes) ? statesRes : (statesRes?.values || []);
    const propList = Array.isArray(propsRes) ? propsRes : (propsRes?.values || []);

    for (const s of stateList) {
      const key = `${projectId}:${t.id}:${s.id}`;
      if (existingStateIds.has(key)) continue;
      statesBatch.push({
        id: s.id, project_id: projectId, work_item_type_id: t.id,
        user_id: userId, name: s.name || '', type: s.type || '', color: s.color || '',
      });
      existingStateIds.add(key);
    }

    for (const p of propList) {
      const key = `${projectId}:${t.id}:${p.id}`;
      if (existingPropertyIds.has(key)) continue;
      propsBatch.push({
        id: p.id, project_id: projectId, work_item_type_id: t.id,
        user_id: userId, name: p.name || p.id, type: p.type || '',
        options: p.options || null,
      });
      existingPropertyIds.add(key);
    }
  }));

  if (statesBatch.length > 0) {
    await WorkItemState.bulkCreate(statesBatch, { ignoreDuplicates: true });
    counts.states = statesBatch.length;
  }
  if (propsBatch.length > 0) {
    await WorkItemProperty.bulkCreate(propsBatch, { ignoreDuplicates: true });
    counts.properties = propsBatch.length;
  }

  // 批量写入优先级
  const prioRes = await getWorkItemPriorities(accessToken, projectId, domain);
  const prioList = Array.isArray(prioRes) ? prioRes : (prioRes?.values || []);
  const newPrios = prioList.filter(p => !existingPriorityIds.has(`${projectId}:${p.id}`));
  if (newPrios.length > 0) {
    await WorkItemPriority.bulkCreate(
      newPrios.map(p => ({
        id: p.id, project_id: projectId, user_id: userId, name: p.name || p.id,
      })),
      { ignoreDuplicates: true }
    );
    newPrios.forEach(p => existingPriorityIds.add(`${projectId}:${p.id}`));
    counts.priorities = newPrios.length;
  }

  return counts;
}

/** 同步 PingCode 项目和工作项（增量：仅新增入向量库与关系库） */
router.post('/sync-data', requireAuth, ensureFreshToken, async (req, res, next) => {
  const user = req.user;
  const userId = user.id;
  const accessToken = user.access_token;
  const domain = user.domain;

  if (!accessToken) {
    return res.status(400).json({ success: false, error: '未连接 PingCode，请先完成授权' });
  }

  try {
    const myself = await getMyself(accessToken, domain);
    if (myself) {
      await user.update({
        pingcode_user_id: myself.id,
        pingcode_user_name: myself.name,
        pingcode_display_name: myself.display_name,
        pingcode_email: myself.email,
        pingcode_avatar: myself.avatar,
      });
    }

    const projectsRes = await getProjects(accessToken, domain);
    const projectList = Array.isArray(projectsRes) ? projectsRes : (projectsRes?.values || []);

    await ensureMetadata(userId, accessToken, domain, projectList);

    const existingProjectRows = await SyncedProject.findAll({
      where: { user_id: userId },
      attributes: ['id'],
    });
    const existingProjectIds = new Set(existingProjectRows.map((r) => r.id));
    const newProjects = projectList.filter((p) => !existingProjectIds.has(p.id));

    const projectColl = await seekdbClient.getCollection({ name: 'projects' });

    if (newProjects.length > 0) {
      await SyncedProject.bulkCreate(
        newProjects.map((p) => ({
          id: p.id,
          user_id: userId,
          name: p.name,
          description: p.description || null,
        }))
      );
      await projectColl.upsert({
        ids: newProjects.map((p) => `${userId}_${p.id}`),
        documents: newProjects.map(
          (p) => `Project: ${p.name}\nDescription: ${p.description || ''}`
        ),
        metadatas: newProjects.map((p) => ({ id: p.id, name: p.name, user_id: userId })),
      });
      console.log(`[Sync] 新增 ${newProjects.length} 个项目`);
    }

    const existingWorkItemRows = await SyncedWorkItem.findAll({
      where: { user_id: userId },
      attributes: ['id'],
    });
    const existingWorkItemIds = new Set(existingWorkItemRows.map((r) => r.id));
    let totalNewItems = 0;
    const workItemColl = await seekdbClient.getCollection({ name: 'work_items' });

    for (const proj of projectList) {
      const itemList = await getWorkItems(accessToken, proj.id, domain);

      const newItems = itemList.filter((item) => !existingWorkItemIds.has(item.id));
      if (newItems.length === 0) continue;

      await SyncedWorkItem.bulkCreate(
        newItems.map((item) => ({
          id: item.id,
          user_id: userId,
          project_id: proj.id,
          title: item.title,
          identifier: item.identifier || null,
        }))
      );

      newItems.forEach((item) => existingWorkItemIds.add(item.id));
      totalNewItems += newItems.length;

      const batches = chunk(newItems, syncWorkItemBatchSize);
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        await workItemColl.upsert({
          ids: batch.map((item) => `${userId}_${item.id}`),
          documents: batch.map(
            (item) => `Title: ${item.title}\nDescription: ${item.description || ''}`
          ),
          metadatas: batch.map((item) => ({
            id: item.id,
            project_id: proj.id,
            title: item.title,
            user_id: userId,
          })),
        });
        if (i < batches.length - 1) await sleep(syncBatchDelayMs);
      }
    }

    if (totalNewItems > 0) {
      console.log(`[Sync] 新增 ${totalNewItems} 个工作项`);
    }

    const totalProjects = (existingProjectRows.length + newProjects.length);
    const totalWorkItems = existingWorkItemRows.length + totalNewItems;

    res.json(
      success(
        {
          projects: totalProjects,
          workItems: totalWorkItems,
          addedProjects: newProjects.length,
          addedWorkItems: totalNewItems,
        },
        '同步完成'
      )
    );
  } catch (e) {
    next(e);
  }
});

export default router;
