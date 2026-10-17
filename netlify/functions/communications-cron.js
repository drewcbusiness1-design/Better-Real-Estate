/* Netlify Scheduled Function: unread-message reminders + queued broadcasts. */
const {runVerificationReminderCycle} = require('../../verificationReminders');
const { runUnreadReminderCycle, runBroadcastCycle } = require('../../communications');

exports.handler = async (event, context) => {
  if (context) context.callbackWaitsForEmptyEventLoop = false;
  try {
    const [reminders, broadcasts, verification, matches] = await Promise.all([
      runUnreadReminderCycle({ limit: 60 }),
      runBroadcastCycle({ limit: 40 }),
      runVerificationReminderCycle({ limit: 40 }),
      require('../../matchDelivery').run({limit:10})
    ]);
    console.log('[communications-cron]', JSON.stringify({ reminders, broadcasts, verification, matches }));
    return { statusCode: 200 };
  } catch (e) {
    console.error('[communications-cron]', e.message, e.stack);
    return { statusCode: 500 };
  }
};
