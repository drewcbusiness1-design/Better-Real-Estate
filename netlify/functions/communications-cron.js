/* Netlify Scheduled Function: unread-message reminders + queued broadcasts. */
const {runVerificationReminderCycle} = require('../../verificationReminders');
const { runUnreadReminderCycle, runBroadcastCycle } = require('../../communications');

exports.handler = async (event, context) => {
  if (context) context.callbackWaitsForEmptyEventLoop = false;
  try {
    const [reminders, broadcasts, verification] = await Promise.all([
      runUnreadReminderCycle({ limit: 60 }),
      runBroadcastCycle({ limit: 40 }),
      runVerificationReminderCycle({ limit: 40 })
    ]);
    console.log('[communications-cron]', JSON.stringify({ reminders, broadcasts, verification }));
    return { statusCode: 200 };
  } catch (e) {
    console.error('[communications-cron]', e.message, e.stack);
    return { statusCode: 500 };
  }
};
