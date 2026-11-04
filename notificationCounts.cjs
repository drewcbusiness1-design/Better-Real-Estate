'use strict';
const policy=require('./policy');
const accounts=require('./affiliateAccounts');

// One source for the existing in-app totals and the iPhone icon badge. `profile`
// is an aggregate, not another category to add to the destinations a second time.
function summaryFor(db,user,dependencies={}) {
  const isAdminUser=dependencies.isAdminUser||(u=>!!u&&u.role==='admin'&&policy.isAdminEmail(u.email));
  const isAffiliateOnlyUser=dependencies.isAffiliateOnlyUser||accounts.isAffiliateOnlyUser;
  const messages=(db.messages||[]).filter(m=>m.toUserId===user.id&&!m.read).length;
  const network=(db.friendRequests||[]).filter(r=>r.status==='pending'&&r.toUserId===user.id&&!isAffiliateOnlyUser(db.users.find(u=>u.id===r.fromUserId))).length;
  const savedsearches=(db.dealNotifications||[]).filter(n=>n.userId===user.id&&!n.read).length;
  const admin=isAdminUser(user);
  const affiliate=admin?(db.affiliateApplications||[]).filter(a=>a.status==='pending').length:0;
  const reports=admin?(db.reports||[]).filter(r=>r.status==='open').length:0;
  const adminAlerts=admin?((db.campaignOutreach||[]).find(g=>g.id==='global')?.alerts||[]).filter(a=>a.userId===user.id&&!a.read).length:0;
  const destinations={messages,network,savedsearches,affiliate,reports,admin:adminAlerts};
  const profile=Object.values(destinations).reduce((n,x)=>n+Number(x||0),0);
  return {total:profile,profile,destinations};
}
module.exports={summaryFor};
