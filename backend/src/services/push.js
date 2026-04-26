const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function isConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

if (isConfigured()) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:hello@diwanberlin.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

function publicKey() {
  return process.env.VAPID_PUBLIC_KEY || '';
}

async function notifyRoles(roles, payload) {
  if (!isConfigured()) return;
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        user: {
          isActive: true,
          role: { in: roles },
        },
      },
    });

    await Promise.allSettled(subscriptions.map(async (record) => {
      const subscription = {
        endpoint: record.endpoint,
        keys: {
          p256dh: record.p256dh,
          auth: record.auth,
        },
      };

      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: record.endpoint } });
        } else {
          console.error('Push notification failed:', error.message || error);
        }
      }
    }));
  } catch (error) {
    console.error('Push notification lookup failed:', error.message || error);
  }
}

module.exports = {
  publicKey,
  notifyRoles,
};
