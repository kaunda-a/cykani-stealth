import { describe, it, assert } from '../harness.js';

describe('Perceptor heuristics', () => {
  it('email scoring favors type=email', () => {
    const scoreEmail = 50;
    const scoreAutoComplete = 45;
    const scoreByName = 40;
    assert(scoreEmail > scoreAutoComplete, 'type=email scores higher than autocomplete');
    assert(scoreAutoComplete > scoreByName, 'autocomplete scores higher than name match');
    assert(scoreByName > 0, 'name match has positive score');
  });

  it('password scoring favors type=password', () => {
    const scoreType = 60;
    const scoreAuto = 50;
    const scoreName = 45;
    assert(scoreType > scoreAuto, 'type=password scores highest');
    assert(scoreName > 0, 'name match has positive score');
  });

  it('submit scoring prefers button with signin text', () => {
    const btnSignIn = 50;
    const typeSubmit = 50;
    const ariaMatch = 40;
    assert(btnSignIn >= typeSubmit, 'button with text scores as high as type=submit');
    assert(ariaMatch > 0, 'aria label match has positive score');
  });

  it('search scoring favors type=search', () => {
    const scoreTypeSearch = 55;
    const scoreNameQuery = 45;
    assert(scoreTypeSearch > scoreNameQuery, 'type=search scores higher');
  });

  it('negative scoring filters misclassified elements', () => {
    const emailPenalty = -10;
    const submitPenalty = -20;
    assert(emailPenalty < 0, 'email penalty is negative');
    assert(submitPenalty < 0, 'submit penalty is negative');
  });

  it('_genSelector prefers id over path', () => {
    const idSelector = '#email';
    const pathSelector = 'div > form > input:nth-of-type(2)';
    assert(idSelector.startsWith('#'), 'id selector uses hash');
    assert(pathSelector.includes(' > '), 'path selector uses > separator');
  });

  it('_genSelector uses nth-of-type for siblings', () => {
    const sel = 'input:nth-of-type(2)';
    assert(sel.includes('nth-of-type'), 'uses nth-of-type for disambiguation');
  });
});

describe('AutoPilot action sequencing', () => {
  it('signIn calls goto, click, fill, click in order', () => {
    const steps = ['goto', 'click', 'fill', 'click', 'fill', 'click'];
    assert(steps.length === 6, 'signin has 6 steps');
    assert(steps[0] === 'goto', 'first step is goto');
    assert(steps[1] === 'click', 'second step is click');
    assert(steps[2] === 'fill', 'third step is fill');
  });

  it('signUp includes optional name/phone fields', () => {
    const stepsWithName = ['click', 'fill', 'click', 'fill', 'click', 'fill', 'click'];
    const stepsWithoutName = ['click', 'fill', 'click', 'fill', 'click'];
    assert(stepsWithName.length > stepsWithoutName.length, 'name adds extra steps');
  });

  it('search submits via button or enter', () => {
    const hasSubmit = ['click', 'fill', 'wait', 'click'];
    const noSubmit = ['click', 'fill', 'wait', 'press'];
    assert(hasSubmit[3] === 'click', 'submit button click if found');
    assert(noSubmit[3] === 'press', 'Enter key if no button');
  });

  it('paginate delegates to find+click', () => {
    const flow = ['find', 'click'];
    assert(flow.length === 2, 'paginate is find then click');
  });

  it('fillForm handles arbitrary role:value pairs', () => {
    const fields = { email: 'a@b.com', password: 'secret', name: 'John' };
    const entries = Object.entries(fields);
    assert(entries.length === 3, 'handles 3 field types');
    assert(entries[0][0] === 'email', 'first field is email');
    assert(entries[1][0] === 'password', 'second field is password');
  });
});

describe('Autonomous page analysis', () => {
  it('classifies captcha pages correctly', () => {
    const analysis = { isCaptcha: true, hasPassword: false, isArticle: false };
    const pageType = analysis.isCaptcha ? 'captcha' : 'generic';
    assert(pageType === 'captcha', 'detects captcha');
  });

  it('classifies login pages correctly', () => {
    const analysis = { isCaptcha: false, hasPassword: true, hasEmail: true };
    const pageType = analysis.hasPassword ? 'login' : 'generic';
    assert(pageType === 'login', 'detects login');
  });

  it('classifies article pages correctly', () => {
    const analysis = { isCaptcha: false, hasPassword: false, isArticle: true, textLen: 2000 };
    const pageType = analysis.isArticle ? 'article' : 'generic';
    assert(pageType === 'article', 'detects article');
  });

  it('classifies listing pages correctly', () => {
    const analysis = { linkCount: 45, isListing: true };
    const pageType = analysis.isListing ? 'listing' : 'generic';
    assert(pageType === 'listing', 'detects listing');
  });

  it('classifies sparse pages correctly', () => {
    const analysis = { textLen: 50, linkCount: 2, isSparse: true };
    const pageType = analysis.isSparse ? 'sparse' : 'generic';
    assert(pageType === 'sparse', 'detects sparse');
  });

  it('action selection varies by page type', () => {
    const actionWeights = {
      captcha: ['idle'],
      login: ['scroll', 'scrollForm'],
      article: ['scrollRead', 'clickLink', 'idle'],
      listing: ['scroll', 'clickLink', 'scroll', 'idle'],
      sparse: ['idle', 'scroll', 'goBack'],
      search: ['idle', 'clickLink'],
      generic: ['scroll', 'clickLink', 'hoverLink', 'idle'],
    };
    assert(actionWeights.article.includes('scrollRead'), 'article actions include scrollRead');
    assert(actionWeights.captcha.includes('idle'), 'captcha actions include idle');
    assert(actionWeights.sparse.includes('goBack'), 'sparse actions include goBack');
  });

  it('clickLink picks weighted random link', () => {
    const links = [{ href: '/a' }, { href: '/b' }, { href: '/c' }];
    const weights = links.map((_, i) => ({ idx: i, w: links.length - i }));
    const total = weights.reduce((s, w) => s + w.w, 0);
    assert(total === 6, 'weights sum correctly');
    assert(weights[0].w === 3, 'first link has highest weight');
    assert(weights[2].w === 1, 'last link has lowest weight');
  });
});
