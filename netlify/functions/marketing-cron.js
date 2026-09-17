/* Netlify Scheduled Function: checks once daily and sends only to opted-in
   users whose last marketing email was at least 48 hours ago. */
const { runMarketingCycle } = require('../../marketing');

exports.handler = async (event, context) => {
  if (context) context.callbackWaitsForEmptyEventLoop = false;
  try {
    const result = await runMarketingCycle({ limit: 60 });
    console.log('[marketing-cron]', JSON.stringify(result));
    return { statusCode: 200 };
  } catch (e) {
    console.error('[marketing-cron]', e.message, e.stack);
    return { statusCode: 500 };
  }
};
