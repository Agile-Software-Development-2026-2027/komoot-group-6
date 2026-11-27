import { Router } from 'express';

import {
  sendFriendRequest,
  getFriends,
  getFriendRequests,
  getFriendshipStatus,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriendship,
} from '../controllers/friendController.js';

import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

// All friendship endpoints require authentication.
router.use(requireAuth);

// Retrieve friends
router.get('/', getFriends);

// Retrieve pending requests
router.get('/requests', getFriendRequests);

// Retrieve relationship status
router.get('/status/:userId', getFriendshipStatus);

// Send a request
router.post('/request', sendFriendRequest);

// Accept a request
router.patch('/:id/accept', acceptFriendRequest);

// Decline a request
router.patch('/:id/decline', declineFriendRequest);

// Cancel a request or remove a friend
router.delete('/:id', removeFriendship);

export default router;