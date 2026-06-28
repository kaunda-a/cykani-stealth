const HEURISTIC_JS = `
function _scoreByRole(el, role) {
  const tag = (el.tagName || '').toLowerCase();
  const type = (el.getAttribute('type') || '').toLowerCase();
  const name = (el.getAttribute('name') || '').toLowerCase();
  const id = (el.getAttribute('id') || '').toLowerCase();
  const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
  const aria = (el.getAttribute('aria-label') || '').toLowerCase();
  const auto = (el.getAttribute('autocomplete') || '').toLowerCase();
  const text = (el.textContent || '').trim().toLowerCase();
  const cls = (el.className || '').toLowerCase();
  const roleAttr = (el.getAttribute('role') || '').toLowerCase();

  let s = 0;

  function match(attr, ...terms) {
    return terms.some(t => attr.includes(t));
  }

  if (role === 'email') {
    if (match(type, 'email')) s += 50;
    if (match(auto, 'email')) s += 45;
    if (match(name, 'email')) s += 40;
    if (match(id, 'email')) s += 40;
    if (match(placeholder, 'email')) s += 35;
    if (match(aria, 'email')) s += 35;
    if (match(name, 'e-mail', 'mail')) s += 25;
    if (match(id, 'e-mail', 'mail')) s += 25;
    if (tag === 'input' && type !== 'hidden' && type !== 'submit') s += 15;
  }

  if (role === 'password') {
    if (match(type, 'password')) s += 60;
    if (match(auto, 'current-password', 'new-password')) s += 50;
    if (match(name, 'password', 'passwd', 'pwd')) s += 45;
    if (match(id, 'password', 'passwd', 'pwd')) s += 45;
    if (match(placeholder, 'password')) s += 35;
    if (match(aria, 'password')) s += 35;
    if (tag === 'input' && type === 'text' && match(name, 'pass')) s += 25;
  }

  if (role === 'username') {
    if (match(auto, 'username')) s += 50;
    if (match(name, 'username', 'user', 'login', 'nick')) s += 45;
    if (match(id, 'username', 'user', 'login', 'nick')) s += 45;
    if (match(placeholder, 'username', 'user', 'login id')) s += 35;
    if (match(aria, 'username', 'user')) s += 35;
    if (match(name, 'email')) s -= 10;
  }

  if (role === 'search') {
    if (match(type, 'search')) s += 55;
    if (match(name, 'search', 'q', 'query')) s += 45;
    if (match(id, 'search', 'q', 'query')) s += 45;
    if (match(placeholder, 'search')) s += 40;
    if (match(aria, 'search')) s += 40;
    if (match(roleAttr, 'search')) s += 35;
  }

  if (role === 'submit') {
    if (match(type, 'submit')) s += 50;
    if (match(auto, 'email')) s -= 20;
    if (match(name, 'email')) s -= 20;
    if (tag === 'button' && match(text, 'sign in', 'signin', 'log in', 'login', 'submit', 'go')) s += 50;
    if (tag === 'button' && match(text, 'sign up', 'signup', 'register', 'create account')) s += 45;
    if (tag === 'input' && match(text, 'sign in', 'signin', 'log in', 'login', 'submit', 'go')) s += 50;
    if (match(aria, 'submit', 'sign in', 'login')) s += 40;
    if (match(cls, 'submit', 'btn-primary', 'login-button')) s += 30;
    if (match(name, 'commit', 'submit')) s += 30;
    if (match(id, 'submit', 'login-btn', 'signin-btn')) s += 30;
    if (tag === 'a' && match(text, 'sign in', 'login')) s += 25;
  }

  if (role === 'textarea') {
    if (match(tag, 'textarea')) s += 60;
    if (match(roleAttr, 'textbox', 'combobox')) s += 30;
    if (match(placeholder, 'message', 'comment', 'reply', 'write')) s += 25;
    if (match(name, 'message', 'comment', 'body', 'content')) s += 25;
    if (match(id, 'message', 'comment', 'body', 'content')) s += 25;
  }

  if (role === 'phone') {
    if (match(type, 'tel')) s += 55;
    if (match(auto, 'tel', 'phone')) s += 45;
    if (match(name, 'phone', 'tel', 'mobile', 'cell')) s += 40;
    if (match(id, 'phone', 'tel', 'mobile', 'cell')) s += 40;
    if (match(placeholder, 'phone', 'mobile')) s += 35;
  }

  if (role === 'name') {
    if (match(auto, 'name', 'given-name', 'family-name')) s += 40;
    if (match(name, 'name', 'firstname', 'lastname', 'fullname')) s += 35;
    if (match(id, 'name', 'firstname', 'lastname', 'fullname')) s += 35;
    if (match(placeholder, 'name', 'first name', 'last name', 'full name')) s += 30;
    if (match(name, 'email')) s -= 15;
    if (match(name, 'password')) s -= 15;
  }

  if (role === 'next') {
    if (match(text, 'next', 'next page', 'older', '→', '›', '»')) s += 50;
    if (match(aria, 'next', 'next page', 'older posts')) s += 45;
    if (match(cls, 'next', 'pagination-next')) s += 30;
    if (match(name, 'next')) s += 30;
    if (match(id, 'next')) s += 30;
    if (tag === 'a' && match(text, 'next')) s += 40;
  }

  if (role === 'prev') {
    if (match(text, 'prev', 'previous', 'newer', '←', '‹', '«')) s += 50;
    if (match(aria, 'previous', 'prev', 'newer posts')) s += 45;
    if (match(cls, 'prev', 'pagination-prev', 'previous')) s += 30;
    if (match(name, 'prev', 'previous')) s += 30;
    if (match(id, 'prev', 'previous')) s += 30;
    if (tag === 'a' && match(text, 'prev', 'previous')) s += 40;
  }

  if (role === 'checkbox') {
    if (match(type, 'checkbox')) s += 55;
    if (match(roleAttr, 'checkbox', 'switch')) s += 35;
    if (match(aria, 'agree', 'accept', 'consent', 'terms')) s += 25;
  }

  return s;
}

function _genSelector(el) {
  if (el.id) return '#' + CSS.escape(el.id);
  let path = [];
  let cur = el;
  while (cur && cur !== document.body && cur !== document.documentElement) {
    let tag = cur.tagName.toLowerCase();
    let parent = cur.parentElement;
    if (parent) {
      let siblings = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
      let idx = siblings.indexOf(cur) + 1;
      if (siblings.length > 1) tag += ':nth-of-type(' + idx + ')';
    }
    path.unshift(tag);
    cur = parent;
  }
  return path.join(' > ');
}

function _findRole(role) {
  let candidates = [];
  let all = document.querySelectorAll('input, button, textarea, a, [role], [tabindex]');
  all.forEach(el => {
    let score = _scoreByRole(el, role);
    if (score > 0) {
      candidates.push({ el, score, sel: _genSelector(el) });
    }
  });
  candidates.sort((a, b) => b.score - a.score);
  return candidates.length ? { selector: candidates[0].sel, score: candidates[0].score, count: candidates.length } : null;
}
`;

export class Perceptor {
  constructor(page) {
    this.page = page;
    this._installed = false;
  }

  async _ensure() {
    if (this._installed) return;
    await this.page.evaluate(HEURISTIC_JS);
    this._installed = true;
  }

  async find(role) {
    await this._ensure();
    return this.page.evaluate((r) => _findRole(r), role);
  }

  async findEmail() { return this.find('email'); }
  async findPassword() { return this.find('password'); }
  async findUsername() { return this.find('username'); }
  async findSearch() { return this.find('search'); }
  async findSubmit() { return this.find('submit'); }
  async findTextarea() { return this.find('textarea'); }
  async findPhone() { return this.find('phone'); }
  async findName() { return this.find('name'); }
  async findNext() { return this.find('next'); }
  async findPrev() { return this.find('prev'); }
  async findCheckbox() { return this.find('checkbox'); }

  async findAll(role) {
    await this._ensure();
    return this.page.evaluate((r) => {
      let results = [];
      let all = document.querySelectorAll('input, button, textarea, a, [role], [tabindex]');
      all.forEach(el => {
        let score = _scoreByRole(el, r);
        if (score > 0) results.push({ selector: _genSelector(el), score });
      });
      results.sort((a, b) => b.score - a.score);
      return results;
    }, role);
  }

  async findLoginFields() {
    const email = await this.findEmail();
    const username = !email ? await this.findUsername() : null;
    const password = await this.findPassword();
    const submit = await this.findSubmit();
    return {
      login: email || username,
      password,
      submit,
    };
  }

  async findSearchBox() {
    const search = await this.findSearch();
    if (search) return search;
    const inputs = await this.findAll('email');
    if (inputs.length === 1) return this.find('email');
    return null;
  }
}
