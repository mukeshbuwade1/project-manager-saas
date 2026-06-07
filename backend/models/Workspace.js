import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: [100, 'Workspace name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    settings: {
      allowInvites: {
        type: Boolean,
        default: true,
      },
      defaultTimezone: {
        type: String,
        default: 'UTC',
      },
    },
    inviteCode: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    inviteCodeExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Workspace = mongoose.model('Workspace', workspaceSchema);

export default Workspace;
