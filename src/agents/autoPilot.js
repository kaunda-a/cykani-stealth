import { Perceptor } from './perceptor.js';

export class AutoPilot {
  constructor(page, choreographer) {
    this.page = page;
    this.choreographer = choreographer;
    this.perceptor = new Perceptor(page);
  }

  async signIn({ email, password, url } = {}) {
    if (url) await this.choreographer.goto(url);
    const fields = await this.perceptor.findLoginFields();
    if (!fields.login) throw new Error('Login field not found');
    if (!fields.password) throw new Error('Password field not found');

    await this.choreographer.click(fields.login.selector);
    await this.choreographer.fill(fields.login.selector, email);

    await this.choreographer.click(fields.password.selector);
    await this.choreographer.fill(fields.password.selector, password);

    if (fields.submit) {
      await this.choreographer.click(fields.submit.selector);
    }
    return fields;
  }

  async signUp({ email, password, name, phone, url } = {}) {
    if (url) await this.choreographer.goto(url);

    const nameF = name ? await this.perceptor.findName() : null;
    const emailF = await this.perceptor.findEmail();
    const passwordF = await this.perceptor.findPassword();
    const phoneF = phone ? await this.perceptor.findPhone() : null;
    const submit = await this.perceptor.findSubmit();

    if (nameF) {
      await this.choreographer.click(nameF.selector);
      await this.choreographer.fill(nameF.selector, name);
    }
    if (emailF) {
      await this.choreographer.click(emailF.selector);
      await this.choreographer.fill(emailF.selector, email);
    }
    if (passwordF) {
      await this.choreographer.click(passwordF.selector);
      await this.choreographer.fill(passwordF.selector, password);
    }
    if (phoneF && phone) {
      await this.choreographer.click(phoneF.selector);
      await this.choreographer.fill(phoneF.selector, phone);
    }
    if (submit) {
      await this.choreographer.click(submit.selector);
    }
    return { name: nameF, email: emailF, password: passwordF, phone: phoneF, submit };
  }

  async search(query, url) {
    if (url) await this.choreographer.goto(url);
    const box = await this.perceptor.findSearch();
    if (!box) throw new Error('Search box not found');

    await this.choreographer.click(box.selector);
    await this.choreographer.fill(box.selector, query);
    await this.choreographer.wait(300);
    const submit = await this.perceptor.findSubmit();
    if (submit) {
      await this.choreographer.click(submit.selector);
    } else {
      await this.page.keyboard.press('Enter');
    }
    return box;
  }

  async paginate(direction = 'next') {
    const role = direction === 'next' ? 'next' : 'prev';
    const btn = await this.perceptor.find(role);
    if (!btn) return null;
    await this.choreographer.click(btn.selector);
    return btn;
  }

  async fillForm(fields) {
    const results = {};
    for (const [role, value] of Object.entries(fields)) {
      const field = await this.perceptor.find(role);
      if (field) {
        await this.choreographer.click(field.selector);
        await this.choreographer.fill(field.selector, value);
        results[role] = field;
      }
    }
    return results;
  }

  async findAndFill(role, value) {
    const field = await this.perceptor.find(role);
    if (!field) throw new Error(`Field "${role}" not found`);
    await this.choreographer.click(field.selector);
    await this.choreographer.fill(field.selector, value);
    return field;
  }

  async findAndClick(role) {
    const el = await this.perceptor.find(role);
    if (!el) throw new Error(`Element "${role}" not found`);
    await this.choreographer.click(el.selector);
    return el;
  }

  async loginSequence({ email, password, url, waitFor }) {
    const result = await this.signIn({ email, password, url });
    if (waitFor) await this.choreographer.wait(waitFor);
    return result;
  }

  async scrollToContent() {
    const height = await this.page.evaluate(() => document.body.scrollHeight);
    const content = await this.page.evaluate(() => {
      const main = document.querySelector('main, article, [role="main"], .content, #content');
      if (main) return main.offsetTop;
      const first = document.querySelector('h1, h2, p');
      return first ? first.offsetTop - 100 : 0;
    });
    if (content > 0) {
      await this.choreographer.scroll({ direction: 'down', amount: Math.max(0, content) });
    }
  }
}
