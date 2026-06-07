import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    identifier: {
      type: String,
      required: true,
      trim: true,
      // e.g. "PRJ-42"
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [500, 'Task title cannot exceed 500 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'in_progress', 'completed'],
        message: 'Status must be pending, in_progress, or completed',
      },
      default: 'pending',
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: 'Priority must be low, medium, or high',
      },
      default: 'medium',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient workspace + project + status queries
taskSchema.index({ workspaceId: 1, projectId: 1, status: 1 });

const Task = mongoose.model('Task', taskSchema);

export default Task;
