import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Comment from '../models/Comment.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate a sequential task identifier in the format PROJECT_KEY-N.
 * Queries existing tasks to find the next available number.
 */
const generateTaskIdentifier = async (projectId, workspaceId) => {
  const project = await Project.findOne({ _id: projectId, workspaceId });
  if (!project) {
    throw Object.assign(new Error('Project not found'), { statusCode: 404 });
  }

  // Find the highest existing task number for this project
  const lastTask = await Task.findOne({ projectId })
    .sort({ createdAt: -1 })
    .select('identifier');

  let nextNum = 1;
  if (lastTask && lastTask.identifier) {
    const parts = lastTask.identifier.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${project.key}-${nextNum}`;
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/tasks
 */
export const createTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const {
      projectId,
      title,
      description,
      status,
      priority,
      assignedTo,
      dueDate,
      sortOrder,
    } = req.body;

    const workspaceId = req.workspaceId;
    const userId = req.user.userId;

    const identifier = await generateTaskIdentifier(projectId, workspaceId);

    const task = await Task.create({
      workspaceId,
      projectId,
      identifier,
      title,
      description,
      status,
      priority,
      assignedTo: assignedTo || null,
      createdBy: userId,
      dueDate: dueDate || null,
      sortOrder: sortOrder || 0,
    });

    return res.status(201).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tasks?workspaceId=...&projectId=...&status=...&priority=...&assignedTo=...&search=...
 */
export const getTasks = async (req, res, next) => {
  try {
    const workspaceId = req.workspaceId;
    const { projectId, status, priority, assignedTo, search } = req.query;

    const filter = { workspaceId };

    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ sortOrder: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tasks/:id
 */
export const getTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const workspaceId = req.workspaceId;

    const task = await Task.findOne({ _id: id, workspaceId })
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('projectId', 'name key color');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/tasks/:id
 */
export const updateTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { id } = req.params;
    const workspaceId = req.workspaceId;

    const allowedFields = [
      'title',
      'description',
      'status',
      'priority',
      'assignedTo',
      'dueDate',
      'sortOrder',
    ];

    const updateFields = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    const task = await Task.findOneAndUpdate(
      { _id: id, workspaceId },
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/tasks/:id/status
 * Status-only update endpoint.
 */
export const updateTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const workspaceId = req.workspaceId;
    const { status } = req.body;

    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const task = await Task.findOneAndUpdate(
      { _id: id, workspaceId },
      { $set: { status } },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/tasks/:id
 * Deletes the task and all its comments.
 */
export const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const workspaceId = req.workspaceId;

    const task = await Task.findOne({ _id: id, workspaceId });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Delete all comments for this task
    await Comment.deleteMany({ taskId: id });

    // Delete the task
    await task.deleteOne();

    return res.status(200).json({
      success: true,
      data: { message: 'Task and all associated comments deleted' },
    });
  } catch (error) {
    next(error);
  }
};
