/*
 * Caeruleum Vercel demo data adapter.
 * This is deliberately a browser-only prototype: JSON state is kept in localStorage,
 * so it persists for this browser but is NOT shared between visitors/devices.
 * Do not use this as secure authentication or for real payments.
 */
(() => {
  'use strict';
  window.CAERULEUM_BROWSER_JSON_MODE = true;
  const STORE_KEY = 'caeruleum.vercel.json.v1';
  const SESSION_KEY = 'caeruleum.vercel.session.v1';
  const MAX_STORE_CHARS = 4_000_000;
  const MAX_UPLOAD_BYTES = 600 * 1024;
  // A 600 KB image becomes about 820 KB when Base64-encoded as a data URL.
  // Keep URL fields comfortably above that size so images are never truncated.
  const MAX_DATA_URL_CHARS = 1_000_000;
  const DEMO_PASSWORDS = {
    'admin@caeruleum.local': 'CaeruleumAdmin2026!',
    'artist@caeruleum.local': 'CaeruleumArtist2026!',
    'artist2@caeruleum.local': 'CaeruleumArtist2026!',
    'client@caeruleum.local': 'CaeruleumClient2026!'
  };
  let storePromise = null;
  let store = null;

  const iso = () => new Date().toISOString();
  const cleanEmail = v => String(v || '').trim().toLowerCase();
  const safeText = (v, max = 5000) => String(v ?? '').trim().slice(0, max);
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const randomId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const response = (message, data = null) => ({ success: true, message, data });
  function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
  function requireRole(user, roles) { if (!user) fail(401, 'Please sign in to continue.'); if (!roles.includes(user.role)) fail(403, 'Your account role does not allow this action.'); return user; }
  function getUser(id) { return store.users.find(u => String(u.id) === String(id)) || null; }
  function getListing(id) { return store.listings.find(l => String(l.id) === String(id)) || null; }
  function getCommission(id) { return store.commissions.find(c => String(c.id) === String(id)) || null; }
  function makeInviteCodeText() {
    const part = () => Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, 'X');
    return `CAERULEUM-${part()}-${part()}`;
  }
  function createInviteCode(creatorId) {
    let code = makeInviteCodeText();
    while (store.inviteCodes.some(existing => existing.code === code)) code = makeInviteCodeText();
    const invitation = { id: store.next.inviteCodeId++, code, createdBy: Number(creatorId), isUsed: false, usedBy: null, createdAt: iso(), usedAt: null };
    store.inviteCodes.unshift(invitation);
    return invitation;
  }
  function createInvitePair(creatorId) {
    return [createInviteCode(creatorId), createInviteCode(creatorId)];
  }
  function findAvailableInviteCode(value) {
    const code = safeText(value, 40).toUpperCase();
    return code ? (store.inviteCodes.find(c => c.code === code && !c.isUsed) || null) : null;
  }
  function publicUser(user) {
    if (!user) return null;
    const { localPasswordSalt, localPasswordHash, passwordSalt, passwordHash, ...publicFields } = user;
    const result = { ...publicFields, portfolio: Array.isArray(user.portfolio) ? user.portfolio : [] };
    if (user.role === 'artist') result.inviteCodes = store.inviteCodes.filter(c => Number(c.createdBy) === Number(user.id));
    return clone(result);
  }
  function currentSession() {
    let session = null;
    try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch {}
    if (!session || Number(session.expiresAt || 0) < Date.now()) return null;
    const user = getUser(session.userId);
    return user ? { session, user } : null;
  }
  function audit(actor, action, target) {
    store.auditlog.unshift({ id: store.next.auditId++, at: iso(), actor: String(actor || 'System'), action, target: safeText(target, 500) });
    store.auditlog = store.auditlog.slice(0, 250);
  }
  function logIntegration(endpoint, message, status = 'DEMO') {
    store.integrationLogs.unshift({ id: store.next.logId++, at: iso(), endpoint, message: safeText(message, 500), status });
    store.integrationLogs = store.integrationLogs.slice(0, 100);
  }
  function notify(userId, message, commissionId = null) {
    store.notifications.unshift({ id: store.next.notificationId++, userId: Number(userId), commissionId: commissionId == null ? null : Number(commissionId), message: safeText(message, 300), read: false, at: iso() });
  }
  function pushHistory(c, from, to, actorId, note) {
    if (!Array.isArray(c.history)) c.history = [];
    c.history.push({ id: store.next.historyId++, from: from ?? null, to, actorId: actorId ?? null, note, at: iso() });
    c.updatedAt = iso();
  }
  function canAccessCommission(user, c) {
    return !!user && !!c && (user.role === 'admin' || Number(user.id) === Number(c.clientId) || Number(user.id) === Number(c.artistId));
  }
  function requireCommission(user, id) {
    const c = getCommission(id);
    if (!c) fail(404, 'Commission not found.');
    if (!canAccessCommission(user, c)) fail(403, 'This commission belongs to another client and artist.');
    return c;
  }
  function checkCsrf(user, body) {
    const sess = currentSession();
    if (!user || !sess) fail(401, 'Please sign in to continue.');
    if (body?.csrf && body.csrf !== sess.session.csrf) fail(403, 'Session token is invalid. Refresh and try again.');
  }
  function persist() {
    const json = JSON.stringify(store);
    if (json.length > MAX_STORE_CHARS) fail(507, 'This browser demo has reached its storage limit. Remove some uploaded files or reset the demo data.');
    try { localStorage.setItem(STORE_KEY, json); }
    catch { fail(507, 'Browser storage is full. Remove large uploads or reset Caeruleum demo data.'); }
  }
  async function loadStore() {
    if (storePromise) return storePromise;
    storePromise = (async () => {
      let saved = null;
      try { saved = localStorage.getItem(STORE_KEY); } catch {}
      if (saved) {
        try { store = JSON.parse(saved); normalize(); return store; } catch { localStorage.removeItem(STORE_KEY); }
      }
      const res = await fetch('/data/seed.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Unable to load public demo JSON (${res.status}).`);
      store = await res.json();
      store.sessions = {};
      store.verificationCodes = [];
      normalize();
      persist();
      return store;
    })();
    return storePromise;
  }
  function normalize() {
    for (const key of ['users','listings','commissions','inviteCodes','notifications','messages','auditlog','integrationLogs','verificationCodes']) if (!Array.isArray(store[key])) store[key] = [];
    if (!store.next) store.next = {};
    const maxId = (arr, field = 'id') => Math.max(0, ...(arr || []).map(x => Number(x?.[field]) || 0)) + 1;
    Object.assign(store.next, {
      userId: store.next.userId || maxId(store.users), listingId: store.next.listingId || maxId(store.listings), commissionId: store.next.commissionId || maxId(store.commissions),
      notificationId: store.next.notificationId || maxId(store.notifications), messageId: store.next.messageId || maxId(store.messages), auditId: store.next.auditId || maxId(store.auditlog),
      logId: store.next.logId || maxId(store.integrationLogs), inviteCodeId: store.next.inviteCodeId || maxId(store.inviteCodes),
      portfolioId: store.next.portfolioId || maxId(store.users.flatMap(u => u.portfolio || [])), fileId: store.next.fileId || maxId(store.commissions.flatMap(c => c.files || [])),
      commentId: store.next.commentId || maxId(store.commissions.flatMap(c => c.comments || [])), historyId: store.next.historyId || maxId(store.commissions.flatMap(c => c.history || [])),
      invoiceId: store.next.invoiceId || maxId(store.commissions.map(c => c.invoice).filter(Boolean)), payoutId: store.next.payoutId || maxId(store.commissions.map(c => c.payout).filter(Boolean)), verificationId: store.next.verificationId || 1
    });
    // One-time upgrade for browser stores saved before verified artists received their own invite pair.
    if (Number(store.inviteMigrationVersion || 0) < 2) {
      for (const artist of store.users.filter(u => u.role === 'artist' && u.isVerified)) {
        let owned = store.inviteCodes.filter(c => Number(c.createdBy) === Number(artist.id)).length;
        while (owned < 2) { createInviteCode(artist.id); owned++; }
      }
      store.inviteMigrationVersion = 2;
      try { persist(); } catch (error) { console.warn('Invite-code migration could not be saved to browser storage:', error); }
    }
  }
  async function passwordHash(salt, password) {
    const bytes = new TextEncoder().encode(`${salt}:${password}`);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  async function checkPassword(user, password) {
    if (user.localPasswordHash && user.localPasswordSalt) return (await passwordHash(user.localPasswordSalt, password)) === user.localPasswordHash;
    return DEMO_PASSWORDS[cleanEmail(user.email)] === password;
  }
  function makeSession(user) {
    const session = { userId: user.id, csrf: `${randomId()}${randomId()}`, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { user: publicUser(user), csrf: session.csrf };
  }
  function signOut() { localStorage.removeItem(SESSION_KEY); }
  function bootstrap() {
    const current = currentSession();
    const user = current?.user || null;
    const commissions = store.commissions.filter(c => !user || user.role === 'admin' || Number(c.clientId) === Number(user.id) || Number(c.artistId) === Number(user.id)).map(c => ({ ...c, files: c.files || [], comments: c.comments || [], history: c.history || [], invoice: c.invoice || null, payout: c.payout || null, paypalTransaction: c.paypalTransaction || null }));
    return { db: {
      users: store.users.map(publicUser), listings: store.listings, commissions,
      inviteCodes: user?.role === 'admin' ? store.inviteCodes : [],
      notifications: user ? store.notifications.filter(n => Number(n.userId) === Number(user.id)) : [],
      auditlog: user?.role === 'admin' ? store.auditlog : [], integrationLogs: user?.role === 'admin' ? store.integrationLogs : []
    }, currentUser: publicUser(user), csrf: current?.session?.csrf || null, setupRequired: false, storageMode: 'browser-local-json' };
  }
  function bodyOf(options) {
    const b = options?.body;
    if (b instanceof FormData) return Object.fromEntries(b.entries());
    if (typeof b === 'string') { try { return JSON.parse(b); } catch { return {}; } }
    return b && typeof b === 'object' ? b : {};
  }
  function urlParts(endpoint) {
    const url = new URL(String(endpoint), location.origin);
    const leaf = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '').replace(/\.php$/i, '').toLowerCase();
    return { endpoint: leaf, action: String(url.searchParams.get('action') || '').toLowerCase() };
  }
  function inferMimeType(file) {
    const supplied = String(file?.type || '').trim().toLowerCase();
    if (supplied && supplied !== 'application/octet-stream') return supplied;
    const name = String(file?.name || '').toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : '';
    const byExt = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
      webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif', bmp: 'image/bmp',
      psd: 'image/vnd.adobe.photoshop', pdf: 'application/pdf', mp4: 'video/mp4',
      mov: 'video/quicktime', zip: 'application/zip', txt: 'text/plain'
    };
    return byExt[ext] || supplied || 'application/octet-stream';
  }
  function isDisplayableImage(mimeType, fileName) {
    const mime = String(mimeType || '').toLowerCase();
    const name = String(fileName || '').toLowerCase();
    if (/photoshop|image\/vnd\.adobe\.photoshop/.test(mime) || /\.psd$/.test(name)) return false;
    return mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|avif|bmp)$/.test(name);
  }
  function toDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!(file instanceof File)) return reject(new Error('Choose a file to upload.'));
      if (file.size > MAX_UPLOAD_BYTES) return reject(new Error('For the Vercel no-database demo, uploads are limited to 600 KB per file because data is stored in this browser.'));
      const mimeType = inferMimeType(file);
      const reader = new FileReader(); reader.onerror = () => reject(new Error('Could not read the selected file.'));
      reader.onload = () => {
        let dataUrl = String(reader.result || '');
        // Some browsers emit application/octet-stream if a file lacks MIME metadata.
        // Restore the image MIME from its file extension so <img> can display it.
        if (/^data:application\/octet-stream;/i.test(dataUrl) && mimeType.startsWith('image/')) {
          dataUrl = dataUrl.replace(/^data:application\/octet-stream;/i, `data:${mimeType};`);
        }
        resolve({ dataUrl, mimeType });
      };
      reader.readAsDataURL(file);
    });
  }
  async function apiRequest(endpoint, options = {}) {
    await loadStore();
    const { endpoint: route, action } = urlParts(endpoint);
    const method = String(options.method || 'GET').toUpperCase();
    let body = bodyOf(options);
    const current = currentSession();
    const user = current?.user || null;
    let data = null, message = 'Request completed.';

    if (route === 'health' || route === 'status') return response('Caeruleum browser JSON demo is ready.', { ok: true, storageMode: 'browser-local-json', persistentPerBrowser: true, database: false, externalServices: false });
    if (route === 'bootstrap') { data = bootstrap(); message = 'Application data loaded.'; return response(message, data); }
    if (route === 'auth') {
      if (action === 'login') {
        const email = cleanEmail(body.email), password = String(body.password || '');
        const account = store.users.find(u => cleanEmail(u.email) === email);
        if (!account || !(await checkPassword(account, password))) fail(401, 'Email or password is incorrect.');
        if (account.emailVerified === false) fail(403, 'Complete the local email verification step before signing in.');
        const sessionData = makeSession(account); audit(account.name, 'LOGIN', account.email); persist(); return response('Signed in.', sessionData);
      }
      if (action === 'register_verified') {
        const name = safeText(body.name, 100), email = cleanEmail(body.email), password = String(body.password || ''), confirm = String(body.confirmPassword || ''), role = String(body.role || 'client');
        if (name.length < 2) fail(400, 'Enter a name with at least two characters.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Enter a valid email address.');
        if (password.length < 8 || password.length > 72) fail(400, 'Password must be between 8 and 72 characters.');
        if (password !== confirm) fail(400, 'Passwords do not match.');
        if (!['client','artist'].includes(role)) fail(400, 'Choose Client or Artist as your role.');
        if (store.users.some(u => cleanEmail(u.email) === email)) fail(409, 'An account with this email already exists.');
        const inviteCode = safeText(body.inviteCode, 40).toUpperCase();
        let invitation = null;
        if (role === 'artist') {
          if (!inviteCode) fail(400, 'An artist invite code is required to register as an artist.');
          invitation = findAvailableInviteCode(inviteCode);
          if (!invitation) fail(400, 'The artist invite code is invalid or already used. Ask an admin or verified artist for an unused code.');
        }
        const verification = [...store.verificationCodes].reverse().find(v => v.email === email && !v.usedAt);
        if (!verification) fail(400, 'Request a local verification code before creating an account.');
        if (Date.now() - new Date(verification.createdAt).getTime() > 600000) fail(400, 'The verification code expired. Request another code.');
        if (verification.attempts >= 5) fail(429, 'Too many incorrect attempts. Request another code.');
        if (String(body.emailCode || '').trim() !== verification.code) { verification.attempts++; persist(); fail(400, 'The verification code is incorrect.'); }
        verification.usedAt = iso();
        const salt = randomId();
        const account = { id: store.next.userId++, name, email, role, bio: '', isVerified: role === 'artist', emailVerified: true, joined: iso(), portfolio: [], localPasswordSalt: salt, localPasswordHash: await passwordHash(salt, password) };
        if (invitation) {
          invitation.isUsed = true;
          invitation.usedBy = account.id;
          invitation.usedAt = iso();
        }
        store.users.push(account);
        if (role === 'artist') createInvitePair(account.id);
        audit(account.name, 'REGISTER', `${role} account created in browser demo: ${email}`);
        if (invitation) audit(account.name, 'ARTIST_INVITE_REDEEMED', invitation.code);
        logIntegration('BROWSER DEMO AUTH', 'An account was saved in this browser only.', 'DEMO');
        const sessionData = makeSession(account); persist(); return response('Account created. Local demo verification completed.', sessionData);
      }
      if (action === 'logout') { if (user) audit(user.name, 'LOGOUT', user.email); signOut(); persist(); return response('Signed out.', {}); }
      if (action === 'update_profile') {
        requireRole(user, ['client','artist','admin']); checkCsrf(user, body);
        const name = safeText(body.name, 100); if (name.length < 2) fail(400, 'Display name must be at least two characters.');
        user.name = name; user.bio = safeText(body.bio, 2000);
        if (body.profileImageUrl) user.profileImageUrl = safeText(body.profileImageUrl, MAX_DATA_URL_CHARS);
        if (body.profileImageName) user.profileImageName = safeText(body.profileImageName, 180);
        audit(user.name, 'PROFILE_UPDATED', 'Account profile updated.'); persist(); return response('Profile updated.', { user: publicUser(user) });
      }
      if (action === 'change_password') {
        requireRole(user, ['client','artist','admin']);
        if (!(await checkPassword(user, String(body.currentPassword || '')))) fail(400, 'Current password is incorrect.');
        const next = String(body.newPassword || ''); if (next.length < 8 || next.length > 72) fail(400, 'New password must be between 8 and 72 characters.');
        if (next !== String(body.confirmPassword || '')) fail(400, 'New passwords do not match.');
        user.localPasswordSalt = randomId(); user.localPasswordHash = await passwordHash(user.localPasswordSalt, next); audit(user.name, 'PASSWORD_CHANGED', 'Browser demo password updated.'); persist(); return response('Password changed successfully.', {});
      }
      if (action === 'verify_artist') {
        const artist = requireRole(user, ['artist']);
        if (artist.isVerified) fail(409, 'This artist account is already verified.');
        const code = safeText(body.code, 40).toUpperCase();
        const invitation = findAvailableInviteCode(code);
        if (!invitation) fail(400, 'The invite code is invalid or already used.');
        invitation.isUsed = true; invitation.usedBy = artist.id; invitation.usedAt = iso();
        artist.isVerified = true;
        const newCodes = createInvitePair(artist.id);
        audit(artist.name, 'ARTIST_VERIFIED', code); persist();
        return response('Artist verified. Two single-use invite codes have been added to your account.', { user: publicUser(artist), inviteCodes: newCodes });
      }
    }
    if (route === 'invite_codes' && action === 'validate') {
      const code = safeText(body.code, 40).toUpperCase();
      if (!code) fail(400, 'An artist invite code is required.');
      const invitation = findAvailableInviteCode(code);
      if (!invitation) fail(400, 'The artist invite code is invalid or already used. Ask an admin or verified artist for an unused code.');
      return response('Artist invite code is valid.', { valid: true, code: invitation.code });
    }
    if (route === 'email-verification' && action === 'send_code') {
      const email = cleanEmail(body.email), name = safeText(body.name, 100);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Enter a valid email address.');
      if (store.users.some(u => cleanEmail(u.email) === email)) fail(409, 'An account with this email already exists.');
      const code = String(Math.floor(100000 + Math.random() * 900000));
      store.verificationCodes = store.verificationCodes.filter(v => v.email !== email || (v.usedAt && Date.now() - new Date(v.usedAt).getTime() > 86400000));
      store.verificationCodes.push({ id: store.next.verificationId++, name, email, code, createdAt: iso(), attempts: 0, usedAt: null });
      logIntegration('LOCAL EMAIL DEMO', `A demo verification code was created for ${email}; no email was sent.`, 'DEMO'); persist();
      return response('Local demo code generated. No email was sent.', { email, demoCode: code, expiresInSeconds: 600, delivery: 'browser-demo-only' });
    }
    if (route === 'uploads' || route === 'upload') {
      requireRole(user, ['client','artist','admin']);
      let file = body.file;
      if (!(file instanceof File) || !file.size) fail(400, 'Choose a file to upload.');
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!['jpg','jpeg','png','gif','webp','svg','psd','pdf','mp4','mov','zip','txt'].includes(ext)) fail(415, 'This file type is not supported.');
      const uploaded = await toDataUrl(file);
      const meta = { url: uploaded.dataUrl, fileName: file.name, mimeType: uploaded.mimeType, fileSize: file.size };
      logIntegration('BROWSER FILE UPLOAD', `${user.name} added ${file.name} to browser JSON storage.`, 'DEMO'); persist(); return response('File stored in this browser.', meta);
    }
    if (route === 'listings' && action === 'create') {
      requireRole(user, ['artist']); checkCsrf(user, body);
      const title=safeText(body.title,160), description=safeText(body.description,2000), category=safeText(body.category,40), price=Number(body.price), days=Number(body.deliveryDays), slots=Number(body.slotsTotal);
      if (title.length < 3 || description.length < 10) fail(400, 'Enter a listing title and a description of at least 10 characters.');
      if (!['Illustration','Live2D','3D Asset','Animation'].includes(category)) fail(400, 'Choose a supported category.');
      if (!Number.isFinite(price) || price < 5 || price > 100000) fail(400, 'Price must be between $5 and $100,000.');
      if (!Number.isInteger(days) || days < 1 || days > 365) fail(400, 'Delivery days must be between 1 and 365.');
      if (!Number.isInteger(slots) || slots < 1 || slots > 100) fail(400, 'Slots must be between 1 and 100.');
      const listing={id:store.next.listingId++,artistId:user.id,title,category,price,deliveryDays:days,slotsTotal:slots,slotsUsed:0,description,coverImageUrl:body.coverImageUrl||null,coverImageName:body.coverImageName||null,coverImageMime:body.coverImageMime||null,coverImageSize:Number(body.coverImageSize)||null,coverIsImage:isDisplayableImage(body.coverImageMime,body.coverImageName),createdAt:iso(),updatedAt:iso()};
      store.listings.unshift(listing); audit(user.name,'LISTING_CREATED',title); persist(); return response('Listing published.',{listing});
    }
    if (route === 'artist_media' && action === 'add_portfolio') {
      requireRole(user,['artist']); checkCsrf(user,body);
      const title=safeText(body.title,160), url=safeText(body.url,MAX_DATA_URL_CHARS), mimeType=safeText(body.mimeType,100)||'application/octet-stream';
      if(!title||!url) fail(400,'Portfolio title and artwork file are required.');
      const item={id:store.next.portfolioId++,artistId:user.id,title,description:safeText(body.description,1000),url,fileName:safeText(body.fileName,180),mimeType,fileSize:Number(body.fileSize)||null,isImage:isDisplayableImage(mimeType,body.fileName),isPsd:/photoshop/i.test(mimeType)||/\.psd$/i.test(String(body.fileName||'')),createdAt:iso()};
      if(!Array.isArray(user.portfolio)) user.portfolio=[]; user.portfolio.unshift(item); audit(user.name,'PORTFOLIO_ADDED',title); persist(); return response('Portfolio item added.',{item});
    }
    if (route === 'commissions') {
      if(action==='create'){
        requireRole(user,['client']);checkCsrf(user,body);const listing=getListing(body.listingId);if(!listing)fail(404,'Listing not found.');if(Number(listing.slotsTotal)<=Number(listing.slotsUsed))fail(409,'This listing is full.');
        const brief=safeText(body.brief,5000);if(brief.length<10)fail(400,'Please enter a brief with at least 10 characters.');if(Number(listing.artistId)===Number(user.id))fail(400,'You cannot commission your own listing.');
        listing.slotsUsed=Number(listing.slotsUsed)+1;const c={id:store.next.commissionId++,listingId:Number(listing.id),clientId:user.id,artistId:Number(listing.artistId),status:'requested',paymentStatus:'pending',price:Number(listing.price),brief,revisions:0,createdAt:iso(),updatedAt:iso(),files:[],comments:[],history:[],invoice:null,payout:null,paypalTransaction:null};pushHistory(c,null,'requested',user.id,'Commission requested.');store.commissions.unshift(c);
        const artist=getUser(listing.artistId);notify(listing.artistId,`${user.name} sent you a commission request: ${listing.title}.`,c.id);notify(user.id,`Your commission request was sent to ${artist?.name||'the artist'}.`,c.id);audit(user.name,'COMMISSION_REQUESTED',`#${c.id}: ${listing.title}`);persist();return response('Commission request submitted.',{id:c.id,commission:c});
      }
      if(action==='status'){
        const c=requireCommission(user,body.id);checkCsrf(user,body);const next=String(body.status||'');if(!['accepted','declined','inprogress','inreview','delivered','cancelled'].includes(next))fail(400,'Unknown commission status.');
        const artist=Number(user.id)===Number(c.artistId),client=Number(user.id)===Number(c.clientId);let valid=false;
        if(artist&&c.status==='requested'&&['accepted','declined'].includes(next))valid=true;
        if(artist&&c.status==='accepted'&&c.paymentStatus==='paid'&&next==='inprogress')valid=true;if(artist&&c.status==='inprogress'&&next==='inreview')valid=true;if(client&&c.status==='inreview'&&(next==='delivered'||(body.revision&&next==='inprogress')))valid=true;if(user.role==='admin')valid=true;
        if(!valid)fail(400,'That status change is not available for your role at this stage.');const prev=c.status;c.status=next;if(body.revision)c.revisions=Number(c.revisions||0)+1;pushHistory(c,prev,next,user.id,body.revision?'Client requested a revision.':`Status changed to ${next}.`);const recipient=Number(user.id)===Number(c.clientId)?c.artistId:c.clientId;notify(recipient,`Commission #${c.id} status changed to ${next}.`,c.id);audit(user.name,'COMMISSION_STATUS_CHANGED',`#${c.id}: ${prev} -> ${next}`);persist();return response('Commission status updated.',{commission:c});
      }
      if(action==='pay_escrow'){
        const c=requireCommission(user,body.id);if(Number(user.id)!==Number(c.clientId))fail(403,'Only the client can record the demo payment.');if(c.status!=='accepted'||c.paymentStatus==='paid')fail(400,'This commission is not waiting for a demo payment.');
        c.paymentStatus='paid';c.invoice={id:store.next.invoiceId++,commissionId:c.id,invoiceNumber:`CAE-DEMO-${c.id}-${Date.now().toString().slice(-5)}`,clientId:c.clientId,artistId:c.artistId,subtotal:c.price,platformFee:0,total:c.price,status:'paid',issuedAt:iso(),paidAt:iso(),demo:true};c.paypalTransaction={id:store.next.payoutId++,commissionId:c.id,paypalOrderId:`BROWSER-DEMO-ORDER-${c.id}`,paypalCaptureId:`BROWSER-DEMO-CAPTURE-${c.id}`,environment:'browser-demo',currency:'USD',amount:c.price,status:'simulated',payerEmail:user.email,createdAt:iso(),updatedAt:iso()};notify(c.artistId,`A browser demo payment was recorded for commission #${c.id}.`,c.id);audit(user.name,'DEMO_PAYMENT_RECORDED',`#${c.id}; no money moved.`);persist();return response('Demo payment recorded. No real payment was processed.',{commission:c});
      }
      if(action==='release_escrow'){
        const c=requireCommission(user,body.id);if(Number(user.id)!==Number(c.clientId))fail(403,'Only the client can release a payment.');if(c.status!=='delivered'||c.paymentStatus!=='paid')fail(400,'Complete delivery and record a demo payment before releasing.');
        c.paymentStatus='released';c.payout={id:store.next.payoutId++,commissionId:c.id,invoiceId:c.invoice?.id||null,artistId:c.artistId,amount:Math.round(c.price*.92*100)/100,status:'pending',reference:`LOCAL-PAYOUT-${c.id}`,createdAt:iso(),paidAt:null,demo:true};notify(c.artistId,`The client released the demo payment for commission #${c.id}.`,c.id);audit(user.name,'DEMO_PAYMENT_RELEASED',`#${c.id}`);persist();return response('Demo payment released. No money was transferred.',{commission:c});
      }
      if(action==='add_comment'){
        const c=requireCommission(user,body.commissionId);checkCsrf(user,body);const value=safeText(body.text,3000);if(!value)fail(400,'Comment cannot be empty.');c.comments=c.comments||[];c.comments.push({id:store.next.commentId++,authorId:user.id,text:value,at:iso()});const other=Number(user.id)===Number(c.clientId)?c.artistId:c.clientId;notify(other,`${user.name} commented on commission #${c.id}.`,c.id);audit(user.name,'COMMISSION_COMMENT_ADDED',`#${c.id}`);persist();return response('Comment added.',{commission:c});
      }
      if(action==='add_file'){
        const c=requireCommission(user,body.commissionId);if(Number(user.id)!==Number(c.artistId))fail(403,'Only the assigned artist can submit deliverables.');const label=safeText(body.label,180),url=safeText(body.url,MAX_DATA_URL_CHARS);if(!label||!url)fail(400,'File title and file/link are required.');if(!/^https:\/\//i.test(url)&&!url.startsWith('/uploads/')&&!url.startsWith('data:'))fail(400,'Use an uploaded file or an HTTPS external link.');
        const mime=safeText(body.mimeType,120)||'';const fn=safeText(body.fileName,180)||'upload';const files=c.files||(c.files=[]);const f={id:store.next.fileId++,type:body.type==='final'?'final':'wip',label,url,addedBy:user.id,fileName:fn,mimeType:mime,fileSize:Number(body.fileSize)||null,isImage:isDisplayableImage(mime,fn),isPsd:/photoshop/i.test(mime)||/\.psd$/i.test(fn),versionNo:1+files.filter(x=>x.label===label).length,createdAt:iso()};files.push(f);audit(user.name,'DELIVERABLE_ADDED',`#${c.id}: ${label}`);notify(c.clientId,`${user.name} submitted ${label} for commission #${c.id}.`,c.id);persist();return response('Deliverable added.',{file:f});
      }
    }
    if (route === 'messages') {
      if(method==='GET'&&!action){requireRole(user,['client','artist','admin']);data={messages:store.messages.filter(m=>Number(m.senderId)===Number(user.id)||Number(m.recipientId)===Number(user.id))};return response('Messages loaded.',data);}
      if(action==='send'){
        requireRole(user,['client','artist']);const c=getCommission(body.commissionId);if(!c||!canAccessCommission(user,c)||user.role==='admin')fail(403,'You do not have access to this conversation.');const message=safeText(body.message,5000);if(!message&&!body.attachmentUrl)fail(400,'Write a message or attach a file.');const recipient=Number(user.id)===Number(c.clientId)?c.artistId:c.clientId;const m={id:store.next.messageId++,commissionId:c.id,senderId:user.id,recipientId:recipient,message,sentAt:iso(),readAt:null,attachmentUrl:body.attachmentUrl||null,attachmentName:body.attachmentName||null,attachmentMime:body.attachmentMime||null,attachmentSize:Number(body.attachmentSize)||null};store.messages.push(m);notify(recipient,`New message from ${user.name} on commission #${c.id}.`,c.id);audit(user.name,'MESSAGE_SENT',`#${c.id}`);persist();return response('Message sent.',{message:m});
      }
      if(action==='mark_thread_read'){
        requireRole(user,['client','artist']);checkCsrf(user,body);const c=getCommission(body.commissionId);if(!c||!canAccessCommission(user,c))fail(403,'You do not have access to this conversation.');const now=iso();for(const m of store.messages)if(Number(m.commissionId)===Number(c.id)&&Number(m.recipientId)===Number(user.id)&&!m.readAt)m.readAt=now;store.notifications.forEach(n=>{if(Number(n.userId)===Number(user.id)&&Number(n.commissionId)===Number(c.id))n.read=true;});persist();return response('Conversation marked as read.',{});
      }
    }
    if(route==='notifications'){
      requireRole(user,['client','artist','admin']);checkCsrf(user,body);
      if(action==='mark_read'){const n=store.notifications.find(x=>Number(x.id)===Number(body.id)&&Number(x.userId)===Number(user.id));if(!n)fail(404,'Notification not found.');n.read=true;persist();return response('Notification marked as read.',{});}
      if(action==='mark_all_read'){store.notifications.forEach(n=>{if(Number(n.userId)===Number(user.id))n.read=true;});persist();return response('Notifications marked as read.',{});}
    }
    if(route==='admin'){
      const admin=requireRole(user,['admin']);checkCsrf(admin,body);
      if(action==='verify_artist'){const artist=store.users.find(u=>Number(u.id)===Number(body.userId)&&u.role==='artist');if(!artist)fail(404,'Artist account not found.');if(artist.isVerified)fail(409,'Artist account is already verified.');artist.isVerified=true;createInvitePair(artist.id);audit(admin.name,'ADMIN_VERIFIED_ARTIST',artist.email);persist();return response('Artist verified. Two single-use invite codes have been created.',{user:publicUser(artist)});}
      if(action==='generate_code'){const c=createInviteCode(admin.id);audit(admin.name,'INVITE_CODE_GENERATED',c.code);persist();return response('Invite code generated.',c);}
      if(action==='change_role'){const account=store.users.find(u=>Number(u.id)===Number(body.userId));const role=String(body.role||'');if(!account)fail(404,'User account not found.');if(!['client','artist','admin'].includes(role))fail(400,'Invalid role.');if(Number(account.id)===Number(admin.id))fail(400,'You cannot change your own role.');account.role=role;audit(admin.name,'ROLE_CHANGED',`${account.email} -> ${role}`);persist();return response('Role changed.',{user:publicUser(account)});}
    }
    if(route==='analytics'){
      requireRole(user,['artist','admin']);const rows=store.commissions.filter(c=>user.role==='admin'||Number(c.artistId)===Number(user.id));const completed=rows.filter(c=>c.status==='delivered');const revenue=completed.reduce((sum,c)=>sum+Number(c.price||0),0);const durations=rows.map(c=>Math.max(0,(new Date(c.updatedAt||c.createdAt).getTime()-new Date(c.createdAt).getTime())/86400000));
      return response('Analytics loaded.',{summary:{totalCommissions:rows.length,completedCommissions:completed.length,completionRate:rows.length?completed.length/rows.length*100:0,revenue,averageOrderValue:completed.length?revenue/completed.length:0,averageTurnaroundDays:durations.length?durations.reduce((a,b)=>a+b,0)/durations.length:0},scatter:{points:rows.map(c=>({id:c.id,title:getListing(c.listingId)?.title||'Commission',x:Math.max(0,(new Date(c.updatedAt||c.createdAt).getTime()-new Date(c.createdAt).getTime())/86400000),y:Number(c.price||0),status:c.status}))}});
    }
    if(route==='finance'&&action==='simulate_payout'){
      const c=requireCommission(user,body.id);checkCsrf(user,body);if(Number(user.id)!==Number(c.artistId))fail(403,'Only the assigned artist can simulate a payout.');if(c.paymentStatus!=='released'||!c.payout)fail(400,'The client must release the demo payment first.');c.payout.status='paid';c.payout.paidAt=iso();audit(user.name,'DEMO_PAYOUT_SIMULATED',`#${c.id}`);persist();return response('Demo payout completed. No money was transferred.',{payout:c.payout});
    }
    if(route==='paypal'&&action==='config')return response('Local browser payment demo mode.',{enabled:false,demoMode:true,currency:'USD',message:'No real payment provider is configured in this demo.'});
    if(route==='integrations')return response('No external service integrations are enabled.',{integrations:[],storageMode:'browser-local-json'});
    if(route==='mongodb')return response('MongoDB is not used in browser JSON mode.',{configured:false,mode:'browser-local-json'});
    fail(404,`Unknown API route: ${route}${action ? ` (action: ${action})` : ''}.`);
  }

  // Convert browser-adapter results into the same call contract as the existing UI.
  window.caeruleumBrowserApiRequest = async (endpoint, options = {}) => {
    await loadStore();
    try { return await apiRequest(endpoint, options); }
    catch (error) { throw error; }
  };
  window.caeruleumResetBrowserData = () => { localStorage.removeItem(STORE_KEY); localStorage.removeItem(SESSION_KEY); location.reload(); };
})();
