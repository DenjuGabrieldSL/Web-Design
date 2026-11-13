/* Adaptador local do protótipo. Substituir por uma API na integração com o banco. */
(() => {
  'use strict';
  const key = 'aulabirinto.v1';
  const read = () => JSON.parse(localStorage.getItem(key) || '{"users":[],"topics":[],"messages":[]}');
  const write = data => localStorage.setItem(key, JSON.stringify(data));
  const session = () => {
    try { const id = sessionStorage.getItem('aulabirinto.user'); return read().users.find(u => u.id === id); }
    catch { return null; }
  };
  const authPage = /\/(login|cadastro)\.html$/.test(location.pathname);
  if (!authPage && !session()) {
    location.replace('login.html');
    return;
  }
  const id = () => crypto.randomUUID();
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = value => new Date(value).toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'});
  async function passwordHash(password, salt) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({name:'PBKDF2', salt:new TextEncoder().encode(salt), iterations:100000, hash:'SHA-256'}, material, 256);
    return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2,'0')).join('');
  }
  document.addEventListener('DOMContentLoaded', () => {
    const user = session();
    const error = document.querySelector('#feedback');
    const report = message => { if (error) error.textContent = message; };
    document.querySelectorAll('.nav-inner').forEach(nav => {
      for (const [href, label] of [['forum.html','Fórum'],['chat.html','Chat']]) {
        if (!nav.querySelector(`[href="${href}"]`)) {
          const link = document.createElement('a'); link.href = href; link.textContent = label; nav.append(link);
        }
      }
      nav.querySelectorAll('a').forEach(a => {
        if (a.getAttribute('href') === location.pathname.split('/').pop()) a.setAttribute('aria-current','page');
      });
    });
    if (user) document.querySelectorAll('.user-chip').forEach(chip => {
      chip.textContent = user.name + ' · ';
      const button = document.createElement('button'); button.textContent = 'Sair'; button.type = 'button';
      button.onclick = () => { sessionStorage.removeItem('aulabirinto.user'); location.replace('login.html'); };
      chip.append(button);
    });
    document.querySelector('#auth-form')?.addEventListener('submit', async event => {
      event.preventDefault(); report('');
      const form = event.currentTarget, submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      try {
        const fields = new FormData(form), email = fields.get('email').trim().toLowerCase(), password = fields.get('password');
        const data = read(); let account;
        if (form.dataset.mode === 'register') {
          const name = fields.get('name').trim();
          if (!name) throw new Error('Informe seu nome.');
          if (password !== fields.get('confirm')) throw new Error('As senhas não coincidem.');
          if (data.users.some(u => u.email === email)) throw new Error('Este e-mail já está cadastrado. Entre na sua conta.');
          const salt = id(); account = {id:id(), name, email, salt, hash:await passwordHash(password,salt)};
          data.users.push(account); write(data);
        } else {
          account = data.users.find(u => u.email === email);
          if (!account || account.hash !== await passwordHash(password,account.salt)) throw new Error('E-mail ou senha incorretos.');
        }
        sessionStorage.setItem('aulabirinto.user',account.id); location.replace('index.html');
      } catch (err) { report(err.message || 'Não foi possível acessar o armazenamento do navegador.'); }
      finally { submit.disabled = false; }
    });
    if (!user) return;
    const topics = document.querySelector('#topics'), conversation = document.querySelector('#conversation');
    let selected = null;
    const search = document.querySelector('#search'), category = document.querySelector('#filter');
    function renderTopics() {
      const data = read();
      const filtered = data.topics.filter(t => (!category.value || t.category === category.value) && (t.title+' '+t.body).toLowerCase().includes(search.value.toLowerCase().trim()));
      topics.innerHTML = filtered.length ? filtered.slice().reverse().map(t => `<button type="button" class="topic-row" data-topic="${escape(t.id)}"><span class="status active">${escape(t.category)}</span><strong>${escape(t.title)}</strong><small>${escape(t.author)} · ${date(t.created)} · ${t.replies.length} resposta(s)</small></button>`).join('') : '<p class="empty">Nenhum tópico por aqui. Comece uma conversa!</p>';
      if (selected) showTopic(selected);
    }
    function showTopic(topicId) {
      selected = topicId;
      const topic = read().topics.find(t => t.id === topicId), detail = document.querySelector('#topic-detail');
      if (!topic) { selected = null; detail.hidden = true; return; }
      detail.hidden = false;
      detail.innerHTML = `<span class="status active">${escape(topic.category)}</span><h2>${escape(topic.title)}</h2><small>${escape(topic.author)} · ${date(topic.created)}</small><p class="user-text">${escape(topic.body)}</p><h3>Respostas (${topic.replies.length})</h3><div>${topic.replies.map(r => `<article class="reply"><strong>${escape(r.author)}</strong> <small>${date(r.created)}</small><p class="user-text">${escape(r.body)}</p></article>`).join('') || '<p class="muted">Seja a primeira pessoa a responder.</p>'}</div><form id="reply-form" class="form-grid"><label>Sua resposta<textarea name="body" required maxlength="2000"></textarea></label><button class="btn" type="submit">Responder</button></form>`;
      detail.querySelector('form').onsubmit = event => {
        event.preventDefault();
        const body = new FormData(event.currentTarget).get('body').trim(); if (!body) return;
        try { const data = read(); data.topics.find(t => t.id === selected).replies.push({id:id(),author:user.name, userId:user.id,body,created:Date.now()}); write(data); renderTopics(); report('Resposta publicada.'); }
        catch { report('Não foi possível salvar a resposta. Verifique o armazenamento.'); }
      };
    }
    if (topics) {
      renderTopics(); search.oninput = renderTopics; category.onchange = renderTopics;
      topics.onclick = event => { const button = event.target.closest('[data-topic]'); if (button) { showTopic(button.dataset.topic); document.querySelector('#topic-detail').scrollIntoView({behavior:'smooth',block:'start'}); } };
      document.querySelector('#topic-form').onsubmit = event => {
        event.preventDefault(); const form = event.currentTarget, fields = new FormData(form);
        const title = fields.get('title').trim(), body = fields.get('body').trim(); if (!title || !body) return report('Preencha o título e a mensagem.');
        try {
          const data = read(), topicId = id(); data.topics.push({id:topicId,title,body,category:fields.get('category'),author:user.name,userId:user.id,created:Date.now(),replies:[]}); write(data);
          form.reset(); search.value = ''; category.value = ''; selected = topicId; renderTopics(); report('Tópico publicado.');
        } catch { report('Não foi possível salvar o tópico. Verifique o armazenamento.'); }
      };
    }
    const room = document.querySelector('#room');
    function renderMessages() {
      const messages = read().messages.filter(m => m.room === room.value);
      conversation.innerHTML = messages.length ? messages.map(m => `<article class="bubble ${m.userId === user.id ? 'mine' : ''}"><strong>${escape(m.author)}</strong><p class="user-text">${escape(m.body)}</p><small>${date(m.created)}</small></article>`).join('') : '<p class="empty">A sala está tranquila. Envie a primeira mensagem!</p>';
      conversation.scrollTop = conversation.scrollHeight;
    }
    if (conversation) {
      renderMessages(); room.onchange = renderMessages;
      document.querySelector('#message-form').onsubmit = event => {
        event.preventDefault(); const form = event.currentTarget, body = new FormData(form).get('body').trim(); if (!body) return;
        try { const data = read(); data.messages.push({id:id(),room:room.value,body,author:user.name,userId:user.id,created:Date.now()}); write(data); form.reset(); renderMessages(); report(''); form.elements.body.focus(); }
        catch { report('Não foi possível enviar. Verifique o armazenamento.'); }
      };
    }
    addEventListener('storage', event => { if (event.key === key) { if (topics) renderTopics(); if (conversation) renderMessages(); } });
    addEventListener('pageshow', () => { if (!session()) location.replace('login.html'); });
  });
})();
