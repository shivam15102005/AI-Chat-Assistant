import mongoose from 'mongoose';

const messageSchema =
  new mongoose.Schema(
    {
      role: {
        type: String,

        enum: [
          'user',
          'assistant',
        ],

        required: true,
      },

      content: {
        type: String,
        required: true,
        trim: false,
      },

      tone: {
        type: String,

        enum: [
          'professional',
          'casual',
          'concise',
        ],

        default: undefined,
      },

      timestamp: {
        type: Date,
        default: Date.now,
      },
    },

    {
      _id: true,
    }
  );

const conversationSchema =
  new mongoose.Schema(
    {
      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,

        default: 'New Chat',
      },

      messages: {
        type: [messageSchema],
        default: [],
      },
    },

    {
      timestamps: true,
    }
  );

const Conversation =
  mongoose.model(
    'Conversation',
    conversationSchema
  );

export default Conversation;