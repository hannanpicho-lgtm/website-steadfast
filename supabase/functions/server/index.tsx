import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "x-admin-secret"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ── Admin authentication middleware ─────────────────────────────────────────
// Set the ADMIN_SECRET environment variable in Supabase → Project Settings →
// Edge Functions → Secrets. All /admin/* and /cs/admin/* routes require the
// caller to supply the matching value in the x-admin-secret request header.
const adminAuthMiddleware = async (c: any, next: any) => {
  const expected = Deno.env.get('ADMIN_SECRET');
  const supplied = c.req.header('x-admin-secret');
  if (!expected || !supplied || supplied !== expected) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
};

app.use('/make-server-a1c55d7e/admin/*', adminAuthMiddleware);
app.use('/make-server-a1c55d7e/cs/admin/*', adminAuthMiddleware);

// ── Username sanitizer ───────────────────────────────────────────────────────
// Prevents colon-injection attacks against KV key namespaces.
function sanitizeUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  // Allow alphanumeric, underscore, hyphen, dot — max 64 chars
  if (!/^[a-zA-Z0-9_.\-]{1,64}$/.test(trimmed)) return null;
  return trimmed;
}

// Health check endpoint
app.get("/make-server-a1c55d7e/health", (c) => {
  return c.json({ status: "ok" });
});

// Get user data endpoint
app.get("/make-server-a1c55d7e/user/:username", async (c) => {
  try {
    const username = c.req.param("username");
    const userKey = `user:${username}`;
    
    const userData = await kv.get(userKey);
    
    if (!userData) {
      // Create default user data if not exists
      const defaultUser = {
        username,
        vipLevel: 1,
        balance: 0,
        todayCommission: 0,
        holdAmount: 0,
        luckyBonus: 0,
        tasksCompleted: 0,
        tasksLimit: 40,
        lastReset: new Date().toISOString().split('T')[0], // Today's date
        isFrozen: false,
        activePremium: null,
        premiumQueue: [],
      };
      await kv.set(userKey, defaultUser);
      return c.json(defaultUser);
    }
    
    // Check if we need to reset daily tasks
    const today = new Date().toISOString().split('T')[0];
    if (userData.lastReset !== today) {
      userData.tasksCompleted = 0;
      userData.todayCommission = 0;
      userData.lastReset = today;
      await kv.set(userKey, userData);
    }
    
    return c.json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return c.json({ error: 'Failed to fetch user data' }, 500);
  }
});

// Submit task endpoint
app.post("/make-server-a1c55d7e/submit-task", async (c) => {
  try {
    const body = await c.req.json();
    const { productPrice } = body;
    const username = sanitizeUsername(body.username);

    if (!username) {
      return c.json({ error: 'Invalid or missing username' }, 400);
    }
    if (typeof productPrice !== 'number' || !Number.isFinite(productPrice) || productPrice <= 0) {
      return c.json({ error: 'productPrice must be a positive finite number' }, 400);
    }
    
    const userKey = `user:${username}`;
    const userData = await kv.get(userKey);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Check if user has reached daily task limit
    if (userData.tasksCompleted >= userData.tasksLimit) {
      return c.json({ error: 'Daily task limit reached' }, 400);
    }
    
    // Calculate commission based on VIP level
    const commissionRates = {
      1: 0.005,  // 0.5%
      2: 0.01,   // 1%
      3: 0.015,  // 1.5%
      4: 0.02,   // 2%
      5: 0.025   // 2.5%
    };
    
    const commissionRate = commissionRates[userData.vipLevel] || 0.005;
    const commission = productPrice * commissionRate;
    
    // REMOVED: Random premium chance - premium is ADMIN-ONLY now
    
    // Update user data
    userData.tasksCompleted += 1;
    userData.todayCommission += commission;
    userData.balance += commission;  // Only commission is added to balance
    
    // Random lucky bonus (1% chance)
    if (Math.random() < 0.01) {
      const luckyAmount = Math.floor(Math.random() * 100) + 50; // $50-$150
      userData.luckyBonus += luckyAmount;
      userData.balance += luckyAmount;
    }
    
    await kv.set(userKey, userData);
    
    // Save task record
    const taskKey = `task:${username}:${Date.now()}`;
    const taskRecord = {
      username,
      productPrice,
      commission,
      isPremium: false,  // Regular tasks are never premium
      timestamp: new Date().toISOString(),
      tasksCompleted: userData.tasksCompleted,
    };
    await kv.set(taskKey, taskRecord);
    
    return c.json({
      success: true,
      commission,
      isPremium: false,
      tasksCompleted: userData.tasksCompleted,
      tasksLimit: userData.tasksLimit,
      balance: userData.balance,
      todayCommission: userData.todayCommission,
      luckyBonus: userData.luckyBonus,
    });
  } catch (error) {
    console.error('Error submitting task:', error);
    return c.json({ error: 'Failed to submit task' }, 500);
  }
});

// Get task records endpoint
app.get("/make-server-a1c55d7e/tasks/:username", async (c) => {
  try {
    const username = c.req.param("username");
    const taskPrefix = `task:${username}:`;
    
    const tasks = await kv.getByPrefix(taskPrefix);
    
    // Sort by timestamp descending
    const sortedTasks = tasks.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return c.json(sortedTasks);
  } catch (error) {
    console.error('Error fetching task records:', error);
    return c.json({ error: 'Failed to fetch task records' }, 500);
  }
});

// Product catalog (highest value products for bundling)
const productCatalog = [
  { id: 1, name: 'Premium Wireless Headphones', price: 299.99, rating: 4.5, image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop' },
  { id: 2, name: 'Smart Watch Pro', price: 399.00, rating: 4.2, image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=300&fit=crop' },
  { id: 3, name: '10-inch Tablet', price: 549.99, rating: 4.1, image: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=400&h=300&fit=crop' },
];

// Admin assigns premium bundle to user
app.post("/make-server-a1c55d7e/admin/assign-premium-bundle", async (c) => {
  try {
    const { username, premiumProductValue, bundledProductCount, adminUsername } = await c.req.json();
    
    if (!username || !premiumProductValue || !bundledProductCount) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (![1, 2, 3].includes(bundledProductCount)) {
      return c.json({ error: 'Bundled product count must be 1, 2, or 3' }, 400);
    }
    
    const userKey = `user:${username}`;
    const userData = await kv.get(userKey);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Select highest value products for bundling
    const sortedProducts = [...productCatalog].sort((a, b) => b.price - a.price);
    const bundledProducts = sortedProducts.slice(0, bundledProductCount);
    
    // Calculate total bundle value
    const bundledProductsTotal = bundledProducts.reduce((sum, p) => sum + p.price, 0);
    const totalBundleValue = premiumProductValue + bundledProductsTotal;
    
    // Calculate balance after assignment
    const balanceBeforeAssignment = userData.balance;
    const balanceAfterAssignment = balanceBeforeAssignment - totalBundleValue;
    const negativeAmount = balanceAfterAssignment < 0 ? Math.abs(balanceAfterAssignment) : 0;
    
    // Create premium assignment
    const premiumAssignment = {
      id: `premium-${Date.now()}`,
      premiumProductValue,
      premiumProductName: `Premium Product ($${premiumProductValue})`,
      bundledProducts,
      totalBundleValue,
      balanceBeforeAssignment,
      balanceAfterAssignment,
      negativeAmount,
      topUpRequired: negativeAmount,
      tasksCompleted: 0,
      totalTasks: 1 + bundledProductCount, // Premium + bundled products
      assignedAt: new Date().toISOString(),
      assignedBy: adminUsername || 'admin',
      status: 'active', // active, completed, cancelled
      commissionEarned: 0,
    };

    // Initialize premium queue if not exists
    if (!userData.premiumQueue) {
      userData.premiumQueue = [];
    }

    // Add to queue
    userData.premiumQueue.push(premiumAssignment);
    
    // If this is the first in queue, activate it
    if (userData.premiumQueue.length === 1) {
      userData.isFrozen = true;
      userData.activePremium = premiumAssignment;
      userData.balance = balanceAfterAssignment;
      if (negativeAmount > 0) {
        userData.holdAmount = negativeAmount;
      }
    }
    
    await kv.set(userKey, userData);
    
    // Save premium assignment record
    const premiumKey = `premium:${username}:${premiumAssignment.id}`;
    await kv.set(premiumKey, premiumAssignment);
    
    return c.json({
      success: true,
      premiumAssignment,
      balanceAfter: balanceAfterAssignment,
      topUpRequired: negativeAmount,
      queuePosition: userData.premiumQueue.length,
    });
  } catch (error) {
    console.error('Error assigning premium bundle:', error);
    return c.json({ error: 'Failed to assign premium bundle' }, 500);
  }
});

// Complete premium bundle task
app.post("/make-server-a1c55d7e/complete-premium-task", async (c) => {
  try {
    const premiumBody = await c.req.json();
    const { productPrice } = premiumBody;
    const username = sanitizeUsername(premiumBody.username);

    if (!username) {
      return c.json({ error: 'Invalid or missing username' }, 400);
    }
    if (typeof productPrice !== 'number' || !Number.isFinite(productPrice) || productPrice <= 0) {
      return c.json({ error: 'productPrice must be a positive finite number' }, 400);
    }
    
    const userKey = `user:${username}`;
    const userData = await kv.get(userKey);
    
    if (!userData || !userData.activePremium) {
      return c.json({ error: 'No active premium assignment' }, 404);
    }

    const premium = userData.activePremium;
    
    // Calculate commission based on VIP level
    const commissionRates = {
      1: 0.005,  // 0.5%
      2: 0.01,   // 1%
      3: 0.015,  // 1.5%
      4: 0.02,   // 2%
      5: 0.025   // 2.5%
    };
    
    const commissionRate = commissionRates[userData.vipLevel] || 0.005;
    const commission = productPrice * commissionRate;
    
    // Update premium assignment progress
    premium.tasksCompleted += 1;
    premium.commissionEarned += commission;
    
    // Add commission to balance (not product value, only commission)
    userData.balance += commission;
    userData.todayCommission += commission;
    
    // Update hold amount as balance increases
    if (userData.balance < 0) {
      userData.holdAmount = Math.abs(userData.balance);
    } else {
      userData.holdAmount = 0;
    }
    
    // Check if all tasks completed
    if (premium.tasksCompleted >= premium.totalTasks) {
      premium.status = 'completed';
      premium.completedAt = new Date().toISOString();
      
      // Remove from queue
      userData.premiumQueue = userData.premiumQueue.filter(p => p.id !== premium.id);
      
      // Activate next in queue if exists
      if (userData.premiumQueue.length > 0) {
        const nextPremium = userData.premiumQueue[0];
        userData.activePremium = nextPremium;
        userData.isFrozen = true;
        
        // Deduct next bundle value from balance
        const newBalance = userData.balance - nextPremium.totalBundleValue;
        nextPremium.balanceBeforeAssignment = userData.balance;
        nextPremium.balanceAfterAssignment = newBalance;
        nextPremium.negativeAmount = newBalance < 0 ? Math.abs(newBalance) : 0;
        nextPremium.topUpRequired = nextPremium.negativeAmount;
        
        userData.balance = newBalance;
        if (newBalance < 0) {
          userData.holdAmount = Math.abs(newBalance);
        }
      } else {
        // No more premiums in queue
        userData.isFrozen = false;
        userData.activePremium = null;
      }
    } else {
      userData.activePremium = premium;
    }
    
    await kv.set(userKey, userData);
    
    // Update premium assignment record
    const premiumKey = `premium:${username}:${premium.id}`;
    await kv.set(premiumKey, premium);
    
    // Save task record
    const taskKey = `task:${username}:${Date.now()}`;
    const taskRecord = {
      username,
      productPrice,
      commission,
      isPremium: true,
      premiumBundleId: premium.id,
      timestamp: new Date().toISOString(),
    };
    await kv.set(taskKey, taskRecord);
    
    return c.json({
      success: true,
      commission,
      tasksCompleted: premium.tasksCompleted,
      totalTasks: premium.totalTasks,
      balance: userData.balance,
      holdAmount: userData.holdAmount,
      bundleCompleted: premium.status === 'completed',
      nextInQueue: userData.premiumQueue.length > 0,
    });
  } catch (error) {
    console.error('Error completing premium task:', error);
    return c.json({ error: 'Failed to complete premium task' }, 500);
  }
});

// Cancel premium assignment (admin)
app.delete("/make-server-a1c55d7e/admin/cancel-premium/:username/:premiumId", async (c) => {
  try {
    const username = c.req.param("username");
    const premiumId = c.req.param("premiumId");
    
    const userKey = `user:${username}`;
    const userData = await kv.get(userKey);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Find and remove from queue
    const premiumIndex = userData.premiumQueue.findIndex(p => p.id === premiumId);
    if (premiumIndex === -1) {
      return c.json({ error: 'Premium assignment not found' }, 404);
    }

    const cancelledPremium = userData.premiumQueue[premiumIndex];
    cancelledPremium.status = 'cancelled';
    cancelledPremium.cancelledAt = new Date().toISOString();
    
    // If cancelling active premium
    if (userData.activePremium?.id === premiumId) {
      // Restore balance
      userData.balance = cancelledPremium.balanceBeforeAssignment;
      userData.holdAmount = 0;
      
      // Remove from queue
      userData.premiumQueue.splice(premiumIndex, 1);
      
      // Activate next if exists
      if (userData.premiumQueue.length > 0) {
        userData.activePremium = userData.premiumQueue[0];
        userData.isFrozen = true;
      } else {
        userData.activePremium = null;
        userData.isFrozen = false;
      }
    } else {
      // Just remove from queue
      userData.premiumQueue.splice(premiumIndex, 1);
    }
    
    await kv.set(userKey, userData);
    
    // Update premium record
    const premiumKey = `premium:${username}:${premiumId}`;
    await kv.set(premiumKey, cancelledPremium);
    
    return c.json({ success: true, message: 'Premium assignment cancelled' });
  } catch (error) {
    console.error('Error cancelling premium assignment:', error);
    return c.json({ error: 'Failed to cancel premium assignment' }, 500);
  }
});

// Get all premium assignments for a user
app.get("/make-server-a1c55d7e/premium/:username", async (c) => {
  try {
    const username = c.req.param("username");
    const premiumPrefix = `premium:${username}:`;
    
    const premiums = await kv.getByPrefix(premiumPrefix);
    
    // Sort by assigned date descending
    const sortedPremiums = premiums.sort((a, b) => 
      new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    );
    
    return c.json(sortedPremiums);
  } catch (error) {
    console.error('Error fetching premium assignments:', error);
    return c.json({ error: 'Failed to fetch premium assignments' }, 500);
  }
});

// ==================== CS SYSTEM ENDPOINTS ====================

const SUPPORT_LINKS_KEY = 'support:links';
const DEFAULT_SUPPORT_LINKS = {
  whatsappNumber: '1234567890',
  telegramUsername: 'steadfastdigital',
  supportEmail: 'support@steadfastdigital.com',
};

function sanitizeSupportLinks(value: unknown) {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_SUPPORT_LINKS };
  }

  const candidate = value as Record<string, unknown>;
  const whatsappNumber = typeof candidate.whatsappNumber === 'string' && candidate.whatsappNumber.trim()
    ? candidate.whatsappNumber.trim()
    : DEFAULT_SUPPORT_LINKS.whatsappNumber;
  const telegramUsername = typeof candidate.telegramUsername === 'string' && candidate.telegramUsername.trim()
    ? candidate.telegramUsername.trim()
    : DEFAULT_SUPPORT_LINKS.telegramUsername;
  const supportEmail = typeof candidate.supportEmail === 'string' && candidate.supportEmail.trim()
    ? candidate.supportEmail.trim()
    : DEFAULT_SUPPORT_LINKS.supportEmail;

  return {
    whatsappNumber,
    telegramUsername,
    supportEmail,
  };
}

// Get support contact links
app.get("/make-server-a1c55d7e/cs/support-links", async (c) => {
  try {
    const saved = await kv.get(SUPPORT_LINKS_KEY);
    return c.json(sanitizeSupportLinks(saved));
  } catch (error) {
    console.error('Error fetching support links:', error);
    return c.json({ error: 'Failed to fetch support links' }, 500);
  }
});

// Update support contact links
app.post("/make-server-a1c55d7e/cs/support-links", async (c) => {
  try {
    const payload = sanitizeSupportLinks(await c.req.json());
    await kv.set(SUPPORT_LINKS_KEY, payload);
    return c.json({ success: true, links: payload });
  } catch (error) {
    console.error('Error saving support links:', error);
    return c.json({ error: 'Failed to save support links' }, 500);
  }
});

// Create a support ticket
app.post("/make-server-a1c55d7e/cs/create-ticket", async (c) => {
  try {
    const { username, subject, message, category, priority } = await c.req.json();
    
    if (!username || !subject || !message || !category) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const ticket = {
      id: ticketId,
      username,
      subject,
      message,
      category,
      priority: priority || 'medium',
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: [],
      assignedTo: null,
    };
    
    const ticketKey = `ticket:${ticketId}`;
    await kv.set(ticketKey, ticket);
    
    // Add to user's tickets list
    const userTicketsKey = `user:${username}:tickets`;
    const userTickets = await kv.get(userTicketsKey) || [];
    userTickets.push(ticketId);
    await kv.set(userTicketsKey, userTickets);
    
    return c.json({ success: true, ticket });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return c.json({ error: 'Failed to create support ticket' }, 500);
  }
});

// Get user tickets
app.get("/make-server-a1c55d7e/cs/tickets/:username", async (c) => {
  try {
    const username = c.req.param("username");
    const userTicketsKey = `user:${username}:tickets`;
    
    const ticketIds = await kv.get(userTicketsKey) || [];
    
    const tickets = [];
    for (const ticketId of ticketIds) {
      const ticket = await kv.get(`ticket:${ticketId}`);
      if (ticket) {
        tickets.push(ticket);
      }
    }
    
    // Sort by created date descending
    tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json(tickets);
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    return c.json({ error: 'Failed to fetch user tickets' }, 500);
  }
});

// Get all tickets (admin)
app.get("/make-server-a1c55d7e/cs/admin/tickets", async (c) => {
  try {
    const ticketPrefix = 'ticket:ticket_';
    const tickets = await kv.getByPrefix(ticketPrefix);
    
    // Sort by created date descending
    tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json(tickets);
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    return c.json({ error: 'Failed to fetch all tickets' }, 500);
  }
});

// Add response to ticket
app.post("/make-server-a1c55d7e/cs/respond", async (c) => {
  try {
    const { ticketId, message, respondedBy, isAdmin } = await c.req.json();
    
    if (!ticketId || !message || !respondedBy) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const ticketKey = `ticket:${ticketId}`;
    const ticket = await kv.get(ticketKey);
    
    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }
    
    const response = {
      id: `response_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      message,
      respondedBy,
      isAdmin: isAdmin || false,
      createdAt: new Date().toISOString(),
    };
    
    ticket.responses.push(response);
    ticket.updatedAt = new Date().toISOString();
    
    await kv.set(ticketKey, ticket);
    
    return c.json({ success: true, ticket });
  } catch (error) {
    console.error('Error responding to ticket:', error);
    return c.json({ error: 'Failed to respond to ticket' }, 500);
  }
});

// Update ticket status
app.post("/make-server-a1c55d7e/cs/update-status", async (c) => {
  try {
    const { ticketId, status, assignedTo } = await c.req.json();
    
    if (!ticketId || !status) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const VALID_TICKET_STATUSES = ['open', 'in-progress', 'resolved', 'closed'];
    if (!VALID_TICKET_STATUSES.includes(status)) {
      return c.json({ error: `Invalid status. Must be one of: ${VALID_TICKET_STATUSES.join(', ')}` }, 400);
    }
    
    const ticketKey = `ticket:${ticketId}`;
    const ticket = await kv.get(ticketKey);
    
    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }
    
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    
    if (assignedTo !== undefined) {
      ticket.assignedTo = assignedTo;
    }
    
    await kv.set(ticketKey, ticket);
    
    return c.json({ success: true, ticket });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    return c.json({ error: 'Failed to update ticket status' }, 500);
  }
});

// Create live chat message
app.post("/make-server-a1c55d7e/cs/chat/send", async (c) => {
  try {
    const { username, message, isAdmin } = await c.req.json();
    
    if (!username || !message) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const chatKey = `chat:${username}`;
    const chatMessages = await kv.get(chatKey) || [];
    
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      message,
      sender: isAdmin ? 'support' : username,
      isAdmin: isAdmin || false,
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    chatMessages.push(newMessage);
    
    // Keep only last 100 messages
    if (chatMessages.length > 100) {
      chatMessages.shift();
    }
    
    await kv.set(chatKey, chatMessages);
    
    return c.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error sending chat message:', error);
    return c.json({ error: 'Failed to send chat message' }, 500);
  }
});

// Get chat messages
app.get("/make-server-a1c55d7e/cs/chat/:username", async (c) => {
  try {
    const username = c.req.param("username");
    const chatKey = `chat:${username}`;
    
    const messages = await kv.get(chatKey) || [];
    
    return c.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return c.json({ error: 'Failed to fetch chat messages' }, 500);
  }
});

// Mark chat messages as read for the current viewer
app.post("/make-server-a1c55d7e/cs/chat/mark-read", async (c) => {
  try {
    const { username, viewer } = await c.req.json();

    if (!username || (viewer !== 'admin' && viewer !== 'user')) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const chatKey = `chat:${username}`;
    const messages = await kv.get(chatKey) || [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return c.json({ success: true, updated: 0 });
    }

    const shouldMarkAdminMessages = viewer === 'user';
    let updated = 0;

    const nextMessages = messages.map((message) => {
      if (
        message &&
        typeof message === 'object' &&
        message.read === false &&
        Boolean(message.isAdmin) === shouldMarkAdminMessages
      ) {
        updated += 1;
        return {
          ...message,
          read: true,
        };
      }

      return message;
    });

    if (updated > 0) {
      await kv.set(chatKey, nextMessages);
    }

    return c.json({ success: true, updated });
  } catch (error) {
    console.error('Error marking chat messages as read:', error);
    return c.json({ error: 'Failed to mark chat messages as read' }, 500);
  }
});

// Get all active chats (admin)
app.get("/make-server-a1c55d7e/cs/admin/chats", async (c) => {
  try {
    const chatPrefix = 'chat:';
    const allChats = await kv.getByPrefix(chatPrefix);
    
    // Transform to get username and last message
    const chatSummaries = allChats
      .filter(chat => Array.isArray(chat) && chat.length > 0)
      .map((messages, index) => {
        const lastMessage = messages[messages.length - 1];
        const unreadCount = messages.filter(msg => !msg.read && !msg.isAdmin).length;
        
        return {
          username: lastMessage.sender === 'support' ? messages.find(m => m.sender !== 'support')?.sender || 'Unknown' : lastMessage.sender,
          lastMessage: lastMessage.message,
          lastMessageTime: lastMessage.timestamp,
          unreadCount,
          totalMessages: messages.length,
        };
      });
    
    chatSummaries.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    
    return c.json(chatSummaries);
  } catch (error) {
    console.error('Error fetching all chats:', error);
    return c.json({ error: 'Failed to fetch all chats' }, 500);
  }
});

// ==================== PASSWORD RESET ENDPOINTS ====================

// Request password reset
app.post("/make-server-a1c55d7e/auth/forgot-password", async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }
    
    // Find user by email (in real implementation, search KV store for user with this email)
    // For now, we'll simulate this
    const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const resetExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
    
    // Store reset token
    const resetKey = `password_reset:${resetToken}`;
    await kv.set(resetKey, {
      email,
      token: resetToken,
      expiresAt: resetExpiry,
      used: false,
    });
    
    // In a real implementation, send email with reset link
    // For now, we'll just log it
    console.log(`Password reset requested for: ${email}`);
    console.log(`Reset token: ${resetToken}`);
    console.log(`Reset link: /reset-password?token=${resetToken}`);
    
    return c.json({
      success: true,
      message: 'Password reset instructions sent to email',
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return c.json({ error: 'Failed to process password reset request' }, 500);
  }
});

// Verify reset token
app.get("/make-server-a1c55d7e/auth/verify-reset-token/:token", async (c) => {
  try {
    const token = c.req.param("token");
    const resetKey = `password_reset:${token}`;
    
    const resetData = await kv.get(resetKey);
    
    if (!resetData) {
      return c.json({ valid: false, error: 'Invalid or expired reset token' }, 400);
    }
    
    if (resetData.used) {
      return c.json({ valid: false, error: 'This reset link has already been used' }, 400);
    }
    
    if (new Date(resetData.expiresAt) < new Date()) {
      return c.json({ valid: false, error: 'This reset link has expired' }, 400);
    }
    
    return c.json({ valid: true, email: resetData.email });
  } catch (error) {
    console.error('Error verifying reset token:', error);
    return c.json({ error: 'Failed to verify reset token' }, 500);
  }
});

// Reset password with token
app.post("/make-server-a1c55d7e/auth/reset-password", async (c) => {
  try {
    const { token, newPassword, username } = await c.req.json();
    
    if (!token || !newPassword || !username) {
      return c.json({ error: 'Token, username, and new password are required' }, 400);
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }
    
    // Verify token
    const resetKey = `password_reset:${token}`;
    const resetData = await kv.get(resetKey);
    
    if (!resetData || resetData.used || new Date(resetData.expiresAt) < new Date()) {
      return c.json({ error: 'Invalid or expired reset token' }, 400);
    }
    
    // Get user data
    const userKey = `user:${username}`;
    const userData = await kv.get(userKey);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Update password (in real implementation, hash the password)
    userData.password = newPassword; // Should be hashed in production
    userData.passwordUpdatedAt = new Date().toISOString();
    await kv.set(userKey, userData);
    
    // Mark token as used
    resetData.used = true;
    resetData.usedAt = new Date().toISOString();
    await kv.set(resetKey, resetData);
    
    console.log(`Password reset successful for user: ${username}`);
    
    return c.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return c.json({ error: 'Failed to reset password' }, 500);
  }
});

// Change password (authenticated user)
app.post("/make-server-a1c55d7e/auth/change-password", async (c) => {
  try {
    const { username, currentPassword, newPassword } = await c.req.json();
    
    if (!username || !currentPassword || !newPassword) {
      return c.json({ error: 'All fields are required' }, 400);
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return c.json({ error: 'New password must be at least 8 characters' }, 400);
    }
    
    const userKey = `user:${username}`;
    const userData = await kv.get(userKey);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Verify current password (in real implementation, compare hashed passwords)
    if (userData.password && userData.password !== currentPassword) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }
    
    // Update password
    userData.password = newPassword; // Should be hashed in production
    userData.passwordUpdatedAt = new Date().toISOString();
    await kv.set(userKey, userData);
    
    return c.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    return c.json({ error: 'Failed to change password' }, 500);
  }
});

Deno.serve(app.fetch);