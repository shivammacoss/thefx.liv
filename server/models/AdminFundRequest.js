import mongoose from 'mongoose';

// Generate unique request ID
const generateRequestId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AFR${timestamp}${random}`;
};

const adminFundRequestSchema = new mongoose.Schema({
  // Unique request ID
  requestId: {
    type: String,
    unique: true
  },
  
  // Admin making the request
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  adminCode: {
    type: String,
    required: true,
    index: true
  },
  
  // Amount requested
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  
  // Reason/Description
  reason: {
    type: String,
    default: ''
  },
  
  // Status
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  
  // Super Admin action details
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  processedAt: {
    type: Date,
    default: null
  },
  adminRemarks: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Pre-save: Generate request ID
adminFundRequestSchema.pre('save', async function(next) {
  if (this.isNew && !this.requestId) {
    let id = generateRequestId();
    let exists = await mongoose.model('AdminFundRequest').findOne({ requestId: id });
    while (exists) {
      id = generateRequestId();
      exists = await mongoose.model('AdminFundRequest').findOne({ requestId: id });
    }
    this.requestId = id;
  }
  next();
});

// Index for faster queries
adminFundRequestSchema.index({ status: 1, createdAt: -1 });
adminFundRequestSchema.index({ admin: 1, status: 1 });

export default mongoose.model('AdminFundRequest', adminFundRequestSchema);
