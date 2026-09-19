function publicProfileUser(u) {
  return u ? {
    id: u.id,
    name: u.name,
    username: u.username || null,
    role: u.role,
    bio: u.bio || '',
    location: u.location || '',
    avatarUrl: u.avatarUrl || null,
    points: Number(u.points || 0),
    verified: !!u.verified,
    buyingStatus: String(u.buyingStatus || 'active'),
    createdAt: u.createdAt || null
  } : null;
}

function friendRelationship(db, viewerId, otherId) {
  if (!viewerId || !otherId || viewerId === otherId) return { status: 'self', requestId: null };
  const friends = (db.friendships || []).some(f =>
    (f.userAId === viewerId && f.userBId === otherId) || (f.userAId === otherId && f.userBId === viewerId)
  );
  if (friends) return { status: 'friends', requestId: null };
  const outgoing = (db.friendRequests || []).find(r => r.fromUserId === viewerId && r.toUserId === otherId && r.status === 'pending');
  if (outgoing) return { status: 'outgoing_pending', requestId: outgoing.id };
  const incoming = (db.friendRequests || []).find(r => r.fromUserId === otherId && r.toUserId === viewerId && r.status === 'pending');
  if (incoming) return { status: 'incoming_pending', requestId: incoming.id };
  return { status: 'none', requestId: null };
}

function socialUserCard(db, viewerId, u) {
  const listings = (db.listings || []).filter(l => l.ownerId === u.id);
  const markets = [...new Set([u.location, ...listings.map(l => l.city)].filter(Boolean))].slice(0, 4);
  const company = u.companyId ? (db.companies || []).find(c => c.id === u.companyId) : null;
  const friendship = friendRelationship(db, viewerId, u.id);
  return {
    ...publicProfileUser(u),
    listingCount: listings.length,
    followerCount: (db.follows || []).filter(f => f.followingId === u.id).length,
    friendCount: (db.friendships || []).filter(f => f.userAId === u.id || f.userBId === u.id).length,
    markets,
    company: company ? { id: company.id, name: company.name, slug: company.slug || null, logoUrl: company.logoUrl || null } : null,
    following: !!viewerId && (db.follows || []).some(f => f.followerId === viewerId && f.followingId === u.id),
    friendStatus: friendship.status,
    friendRequestId: friendship.requestId
  };
}

function searchUsers(db, viewerId, q = '', role = '') {
  const query = String(q || '').trim().toLowerCase().slice(0, 100);
  const roleFilter = String(role || '').trim().toLowerCase();
  const words = query.split(/\s+/).filter(Boolean);
  let users = (db.users || []).filter(u => u.id !== viewerId);
  if (roleFilter && roleFilter !== 'all') users = users.filter(u => String(u.role || '').toLowerCase() === roleFilter);
  if (words.length) {
    users = users.filter(u => {
      const listingMarkets = (db.listings || []).filter(l => l.ownerId === u.id).map(l => l.city).join(' ');
      const company = u.companyId ? (db.companies || []).find(c => c.id === u.companyId) : null;
      const hay = [u.name, u.username, u.role, u.bio, u.location, company?.name, company?.slug, listingMarkets].filter(Boolean).join(' ').toLowerCase();
      return words.every(w => hay.includes(w));
    });
  }
  const friendRank = s => s === 'friends' ? 0 : s === 'incoming_pending' ? 1 : s === 'outgoing_pending' ? 2 : 3;
  return users
    .map(u => socialUserCard(db, viewerId, u))
    .sort((a, b) => friendRank(a.friendStatus) - friendRank(b.friendStatus) || b.listingCount - a.listingCount || b.points - a.points || a.name.localeCompare(b.name))
    .slice(0, 60);
}

module.exports = { publicProfileUser, friendRelationship, socialUserCard, searchUsers };
