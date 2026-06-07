import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [200, 'Project name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    key: {
      type: String,
      required: [true, 'Project key is required'],
      uppercase: true,
      trim: true,
      maxlength: [6, 'Project key cannot exceed 6 characters'],
      match: [/^[A-Z0-9]+$/, 'Project key must contain only uppercase letters and numbers'],
    },
    color: {
      type: String,
      default: '#5E6AD2',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex color'],
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'completed', 'archived'],
        message: 'Status must be active, completed, or archived',
      },
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient workspace + status queries
projectSchema.index({ workspaceId: 1, status: 1 });

const Project = mongoose.model('Project', projectSchema);

export default Project;
