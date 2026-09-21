import { Router } from 'express';
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  sendMessage,
} from '../controllers/conversationController.js';

const router = Router();

router.post('/', createConversation);
router.get('/', listConversations);
router.get('/:id', getConversation);
router.post('/:id/messages', sendMessage);
router.delete('/:id', deleteConversation);

export default router;
