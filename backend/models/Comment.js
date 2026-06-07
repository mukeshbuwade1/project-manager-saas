import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Comment message is required'],
      trim: true,
      maxlength: [5000, 'Comment cannot exceed 5000 characters'],
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient workspace + task queries
commentSchema.index({ workspaceId: 1, taskId: 1 });

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
