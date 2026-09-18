const assert = require('assert');
const fs = require('fs');
const path = require('path');
const social = require('../social');

const db = {
  users: [
    { id: 'a', name: 'Alex Buyer', email: 'alex@secret.test', phone: '111', role: 'buyer', bio: 'Investor', location: 'Trenton, NJ', points: 4 },
    { id: 'b', name: 'Sam Seller', email: 'sam@secret.test', phone: '222', role: 'seller', bio: 'Wholesaler in North Jersey', location: 'Newark, NJ', points: 15 },
    { id: 'c', name: 'Taylor Deals', email: 'taylor@secret.test', phone: '333', role: 'seller', bio: 'Off market deals', location: '', points: 8 }
  ],
  listings: [
    { id: 'l1', ownerId: 'b', city: 'Newark, NJ' },
    { id: 'l2', ownerId: 'c', city: 'Philadelphia, PA' }
  ],
  follows: [{ followerId: 'a', followingId: 'b' }],
  friendRequests: [{ id: 'r1', fromUserId: 'b', toUserId: 'a', status: 'pending' }],
  friendships: []
};

assert.deepEqual(social.friendRelationship(db, 'a', 'b'), { status: 'incoming_pending', requestId: 'r1' });
assert.equal(social.friendRelationship(db, 'a', 'c').status, 'none');
let found = social.searchUsers(db, 'a', 'Newark', 'all');
assert.equal(found.length, 1);
assert.equal(found[0].id, 'b');
assert.equal(found[0].following, true);
assert.equal(found[0].friendStatus, 'incoming_pending');
assert(!('email' in found[0]), 'network result leaked email');
assert(!('phone' in found[0]), 'network result leaked phone');
found = social.searchUsers(db, 'a', 'Philadelphia', 'seller');
assert.equal(found[0].id, 'c');

db.friendRequests = [];
db.friendships = [{ id: 'f1', userAId: 'a', userBId: 'b' }];
assert.equal(social.friendRelationship(db, 'a', 'b').status, 'friends');
assert.equal(social.socialUserCard(db, 'a', db.users[1]).friendCount, 1);

const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
const store = fs.readFileSync(path.join(__dirname, '..', 'store.js'), 'utf8');
const toml = fs.readFileSync(path.join(__dirname, '..', 'netlify.toml'), 'utf8');
[
  "'/api/friends/request'",
  "'/api/friends/requests'",
  "'/api/conversations'",
  "'/api/messages/unread-count'"
].forEach(s => assert(server.includes(s), `missing server wiring ${s}`));
assert(store.includes("'friendRequests','friendships'"), 'friend collections missing');
assert(toml.includes('social.js'), 'Netlify bundle must include social.js');
['renderNetwork', 'renderChat', 'Find people', 'Add friend', 'friendRequestCount'].forEach(s => assert(app.includes(s), `missing client wiring ${s}`));
console.log('✓ Social network, friends, search & chat tests passed');
