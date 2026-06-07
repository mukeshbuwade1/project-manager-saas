import mongoose from 'mongoose';
import Task from '../models/Task.js';
import Project from '../models/Project.js';

/**
 * GET /api/dashboard/stats?workspaceId=...
 * Returns aggregated stats for a workspace.
 */
export const getStats = async (req, res, next) => {
  try {
    const workspaceId = req.workspaceId;

    const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);

    // Run task aggregation and project count in parallel
    const [taskStats, totalProjects] = await Promise.all([
      Task.aggregate([
        { $match: { workspaceId: workspaceObjectId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Project.countDocuments({ workspaceId }),
    ]);

    // Unpack aggregation results
    const stats = {
      pending: 0,
      in_progress: 0,
      completed: 0,
    };

    taskStats.forEach(({ _id, count }) => {
      if (_id in stats) {
        stats[_id] = count;
      }
    });

    const totalTasks = stats.pending + stats.in_progress + stats.completed;
    const completionRate =
      totalTasks > 0
        ? Math.round((stats.completed / totalTasks) * 100)
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalProjects,
        totalTasks,
        pendingTasks: stats.pending,
        inProgressTasks: stats.in_progress,
        completedTasks: stats.completed,
        completionRate,
      },
    });
  } catch (error) {
    next(error);
  }
};
