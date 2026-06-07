import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Comment from '../models/Comment.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Derive a unique project key from the project name.
 * Takes the first 3–6 uppercase characters/letters.
 */
const generateProjectKey = async (name, workspaceId) => {
  // Extract alphabetic chars, uppercase, take first 6
  const base = name
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6);

  // Check if key already exists in this workspace; if so, add numeric suffix
  let key = base;
  let attempt = 0;
  while (attempt < 10) {
    const existing = await Project.findOne({ workspaceId, key });
    if (!existing) break;
    attempt++;
    key = base.slice(0, 5) + attempt;
  }

  return key;
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/projects
 */
export const createProject = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { name, description, color } = req.body;
    const workspaceId = req.workspaceId;
    const userId = req.user.userId;

    const key = await generateProjectKey(name, workspaceId);

    const project = await Project.create({
      workspaceId,
      name,
      description,
      key,
      color,
      createdBy: userId,
    });

    return res.status(201).json({
      success: true,
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/projects?workspaceId=...&status=...&search=...
 */
export const getProjects = async (req, res, next) => {
  try {
    const workspaceId = req.workspaceId;
    const { status, search } = req.query;

    const filter = { workspaceId };

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const projects = await Project.find(filter)
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: { projects },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/projects/:id
 */
export const getProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const workspaceId = req.workspaceId;

    const project = await Project.findOne({ _id: id, workspaceId }).populate(
      'createdBy',
      'name email avatar'
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Task count stats
    const taskStats = await Task.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(id),
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
        },
      },
      {
        $group: { _id: '$status', count: { $sum: 1 } },
      },
    ]);

    const stats = { total: 0, pending: 0, in_progress: 0, completed: 0 };
    taskStats.forEach(({ _id, count }) => {
      stats[_id] = count;
      stats.total += count;
    });

    return res.status(200).json({
      success: true,
      data: { project, taskStats: stats },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/projects/:id  (admin/manager only)
 */
export const updateProject = async (req, res, next) => {
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
    const { name, description, color, status } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (color !== undefined) updateFields.color = color;
    if (status !== undefined) updateFields.status = status;

    const project = await Project.findOneAndUpdate(
      { _id: id, workspaceId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/projects/:id  (admin only)
 * Also deletes all tasks and comments associated with the project.
 */
export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const workspaceId = req.workspaceId;

    const project = await Project.findOne({ _id: id, workspaceId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Get all task IDs in this project to delete their comments
    const tasks = await Task.find({ projectId: id, workspaceId }).select('_id');
    const taskIds = tasks.map((t) => t._id);

    // Delete comments for all tasks in the project
    if (taskIds.length > 0) {
      await Comment.deleteMany({ taskId: { $in: taskIds } });
    }

    // Delete all tasks in the project
    await Task.deleteMany({ projectId: id, workspaceId });

    // Delete the project
    await project.deleteOne();

    return res.status(200).json({
      success: true,
      data: { message: 'Project and all associated tasks/comments deleted' },
    });
  } catch (error) {
    next(error);
  }
};
