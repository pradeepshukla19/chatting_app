const $ = (id) => document.getElementById(id);
let token = sessionStorage.getItem('token');
let me = JSON.parse(sessionStorage.getItem('user') || 'null');
let socket, users = [], activeUser = null;
const onlineSet = new Set();
const unread = {};

// ---------- Auth ----------
async function auth(path) {
  $('authError').textContent = '';
  const res = await fetch('/api/auth/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: $('username').value.trim(), password: $('password').value }),
  });
  const data = await res.json();
  if (!res.ok) return ($('authError').textContent = data.error);
  token = data.token; me = data.user;
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('user', JSON.stringify(me));
  startApp();
}
$('loginBtn').onclick = () => auth('login');
$('registerBtn').onclick = () => auth('register');
$('logoutBtn').onclick = () => { sessionStorage.clear(); location.reload(); };
$('backBtn').onclick = () => $('app').classList.remove('chatting');

const api = (url) =>
  fetch(url, { headers: { Authorization: 'Bearer ' + token } }).then((r) => {
    if (r.status === 401) { sessionStorage.clear(); location.reload(); }
    return r.json();
  });

// ---------- App ----------
async function startApp() {
  $('auth').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('meName').textContent = me.username;

  users = await api('/api/users');
  renderUsers();

  socket = io({ auth: { token } });
  socket.on('online_users', (ids) => { ids.forEach((i) => onlineSet.add(i)); renderUsers(); });
  socket.on('presence', ({ userId, online }) => {
    online ? onlineSet.add(userId) : onlineSet.delete(userId);
    renderUsers();
  });
  socket.on('private_message', (m) => {
    const other = m.sender === me.id ? m.receiver : m.sender;
    if (activeUser && activeUser._id === other) addMessage(m);
    else { unread[other] = (unread[other] || 0) + 1; renderUsers(); }
  });
  socket.on('connect_error', (e) => { if (e.message === 'Unauthorized') $('logoutBtn').click(); });
}

function renderUsers() {
  const list = $('userList');
  list.innerHTML = '';
  users.forEach((u) => {
    const li = document.createElement('li');
    if (activeUser && activeUser._id === u._id) li.className = 'active';
    const dot = document.createElement('span');
    dot.className = 'dot' + (onlineSet.has(u._id) ? ' on' : '');
    const name = document.createElement('span');
    name.textContent = u.username; // textContent prevents XSS
    li.append(dot, name);
    if (unread[u._id]) {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = unread[u._id];
      li.append(b);
    }
    li.onclick = () => openChat(u);
    list.append(li);
  });
}

async function openChat(user) {
  activeUser = user;
  unread[user._id] = 0;
  $('chatTitle').textContent = user.username;
  $('form').classList.remove('hidden');
  $('app').classList.add('chatting');
  renderUsers();
  $('messages').innerHTML = '';
  const history = await api('/api/messages/' + user._id);
  history.forEach(addMessage);
}

function addMessage(m) {
  const div = document.createElement('div');
  div.className = 'msg' + (m.sender === me.id ? ' mine' : '');
  div.textContent = m.content;
  const t = document.createElement('small');
  t.textContent = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  div.append(t);
  $('messages').append(div);
  $('messages').scrollTop = $('messages').scrollHeight;
}

$('form').onsubmit = (e) => {
  e.preventDefault();
  const content = $('input').value.trim();
  if (!content || !activeUser) return;
  socket.emit('private_message', { to: activeUser._id, content }, (res) => {
    if (res?.error) alert(res.error);
  });
  $('input').value = '';
};

if (token && me) startApp();