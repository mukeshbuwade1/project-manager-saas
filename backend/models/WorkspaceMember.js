import mongoose from 'mongoose';

const workspaceMemberSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'manager', 'member'],
        message: 'Role must be admin, manager, or member',
      },
      default: 'member',
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: a user can only be a member of a workspace once
workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

const WorkspaceMember = mongoose.model('WorkspaceMember', workspaceMemberSchema);

export default WorkspaceMember;
