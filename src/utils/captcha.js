// Captcha — solve reCAPTCHA, hCaptcha, Cloudflare Turnstile via external services
// Supports: 2captcha, CapSolver, Anti-Captcha, BestCaptcha

export class CaptchaSolver {
  constructor(opts = {}) {
    this.apiKey = opts.apiKey;
    this.service = opts.service ?? 'capsolver'; // capsolver, twocaptcha, anticaptcha
    this.baseUrl = this._baseUrl();
    this.timeout = opts.timeout ?? 120000;
    this.pollingInterval = opts.pollingInterval ?? 5000;
  }

  _baseUrl() {
    const urls = {
      capsolver: 'https://api.capsolver.com',
      twocaptcha: 'https://2captcha.com',
      anticaptcha: 'https://api.anti-captcha.com',
    };
    return urls[this.service] ?? urls.capsolver;
  }

  _headers() {
    return { 'Content-Type': 'application/json' };
  }

  async solveRecaptchaV2({ siteKey, pageUrl, enterprise = false }) {
    const task = {
      type: enterprise ? 'ReCaptchaV2EnterpriseTaskProxyLess' : 'ReCaptchaV2TaskProxyLess',
      websiteURL: pageUrl,
      websiteKey: siteKey,
    };
    return this._submitAndPoll(task);
  }

  async solveRecaptchaV3({ siteKey, pageUrl, action = 'verify', minScore = 0.3 }) {
    const task = {
      type: 'ReCaptchaV3TaskProxyLess',
      websiteURL: pageUrl,
      websiteKey: siteKey,
      pageAction: action,
      minScore,
    };
    return this._submitAndPoll(task);
  }

  async solveHCaptcha({ siteKey, pageUrl }) {
    const task = {
      type: 'HCaptchaTaskProxyLess',
      websiteURL: pageUrl,
      websiteKey: siteKey,
    };
    return this._submitAndPoll(task);
  }

  async solveTurnstile({ siteKey, pageUrl }) {
    const task = {
      type: 'AntiCloudflareTask',
      websiteURL: pageUrl,
      websiteKey: siteKey,
    };
    return this._submitAndPoll(task);
  }

  async solveImageCaptcha({ imageBase64, question = null }) {
    const task = {
      type: 'ImageToTextTask',
      body: imageBase64,
      ...(question && { question }),
    };
    return this._submitAndPoll(task);
  }

  async _submitAndPoll(task) {
    const createPayload = { clientKey: this.apiKey, task };
    const createRes = await fetch(`${this.baseUrl}/createTask`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(createPayload),
    });
    const createData = await createRes.json();
    if (createData.errorId !== 0) {
      throw new Error(`[Captcha] createTask failed: ${createData.errorDescription}`);
    }
    const taskId = createData.taskId;

    const start = Date.now();
    while (Date.now() - start < this.timeout) {
      await new Promise((r) => setTimeout(r, this.pollingInterval));
      const result = await fetch(`${this.baseUrl}/getTaskResult`, {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify({ clientKey: this.apiKey, taskId }),
      }).then((r) => r.json());

      if (result.errorId !== 0) {
        throw new Error(`[Captcha] getTaskResult error: ${result.errorDescription}`);
      }
      if (result.status === 'ready') {
        return {
          token: result.solution?.gRecaptchaResponse ?? result.solution?.token ?? result.solution?.text,
          cost: result.cost,
          solveTime: Date.now() - start,
        };
      }
    }
    throw new Error(`[Captcha] Timeout after ${this.timeout}ms`);
  }
}
