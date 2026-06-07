import { validationResult } from 'express-validator';
import Comment from '../models/Comment.js';
import Task from '../models/Task.js';

/**
 * POST /api/comments
 * Add a comment to a task.
 */
export const addComment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { taskId, message } = req.body;
    const workspaceId = req.workspaceId;
    const userId = req.user.userId;

    // Verify the task exists in this workspace
    const task = await Task.findOne({ _id: taskId, workspaceId });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const comment = await Comment.create({
      workspaceId,
      taskId,
      authorId: userId,
      message,
    });

    const populated = await comment.populate('authorId', 'name email avatar');

    return res.status(201).json({
      success: true,
      data: { comment: populated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/comments/:taskId
 * Get all comments for a task.
 */
export const getComments = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const workspaceId = req.workspaceId;

    // Verify the task exists in this workspace
    const task = await Task.findOne({ _id: taskId, workspaceId });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const comments = await Comment.find({ taskId, workspaceId })
      .populate('authorId', 'name email avatar')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: { comments },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/comments/:id
 * The comment's author or a workspace admin can delete it.
 */
export const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const workspaceId = req.workspaceId;
    const userId = req.user.userId;
    const memberRole = req.memberRole;

    const comment = await Comment.findOne({ _id: id, workspaceId });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    const isAuthor = comment.authorId.toString() === userId;
    const isAdmin = memberRole === 'admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this comment',
      });
    }

    await comment.deleteOne();

    return res.status(200).json({
      success: true,
      data: { message: 'Comment deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
};
