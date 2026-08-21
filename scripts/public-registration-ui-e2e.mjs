import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const debugPort = 9229;
const outputDir = resolve(".public-registration-ui-e2e-artifacts");
const profileDir = resolve(".public-registration-ui-e2e-profile");

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function waitFor(check, label, timeout = 12_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await check()) return;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 120));
  }
  throw new Error(`انتهت مهلة انتظار: ${label}`);
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.id = 1;
    this.pending = new Map();
    socket.addEventListener("message", event => {
      const response = JSON.parse(event.data);
      const item = this.pending.get(response.id);
      if (!item) return;
      this.pending.delete(response.id);
      response.error ? item.reject(new Error(response.error.message)) : item.resolve(response.result ?? {});
    });
  }
  static async connect(url) {
    const socket = new WebSocket(url);
    await once(socket, "open");
    return new Cdp(socket);
  }
  send(method, params = {}) {
    const id = this.id++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolvePromise, reject) => this.pending.set(id, { resolve: resolvePromise, reject }));
  }
  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    return result.result.value;
  }
  close() { this.socket.close(); }
}

async function run() {
  await rm(outputDir, { recursive: true, force: true });
  await rm(profileDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  const chrome = spawn("chromium", ["--headless=new", "--no-sandbox", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profileDir}`, "about:blank"], { stdio: "ignore" });
  try {
    let targets = [];
    await waitFor(async () => {
      try {
        targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
        return targets.some(target => target.type === "page");
      } catch { return false; }
    }, "بدء المتصفح");
    const page = targets.find(target => target.type === "page");
    const cdp = await Cdp.connect(page.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Page.navigate", { url: "http://127.0.0.1:3000/auth" });
    await waitFor(() => cdp.evaluate("document.body?.innerText?.includes('تسجيل الدخول')"), "تحميل صفحة الحساب");
    assert(await cdp.evaluate("(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent?.trim() === 'إنشاء حساب'); if (!button) return false; button.click(); return true; })()"), "تعذر فتح نموذج إنشاء الحساب.");
    await waitFor(() => cdp.evaluate("document.body?.innerText?.includes('تأكيد كلمة المرور')"), "فتح نموذج المستخدم العادي");
    const text = await cdp.evaluate("document.body.innerText");
    assert(!text.includes("نوع الحساب"), "ظهر اختيار نوع الحساب رغم إخفائه.");
    assert(!text.includes("رمز تفعيل المشرف"), "ظهر رمز تفعيل المشرف رغم إخفائه.");
    assert(!(await cdp.evaluate("Boolean(document.querySelector('input[type=radio]'))")), "ظهر عنصر اختيار دور قابل للتحديد رغم أن الدور أصبح ثابتًا.");
    assert(text.includes("سيُنشأ حسابك كمستخدم عادي"), "لا توجد إشارة واضحة إلى إنشاء حساب مستخدم عادي.");
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    await writeFile(resolve(outputDir, "public-registration-desktop.png"), Buffer.from(shot.data, "base64"));
    await writeFile(resolve(outputDir, "results.json"), `${JSON.stringify({ checks: ["register-form-open", "admin-controls-hidden", "default-user-copy-visible"] }, null, 2)}\n`);
    console.log(JSON.stringify({ passed: 3, checks: ["register-form-open", "admin-controls-hidden", "default-user-copy-visible"] }, null, 2));
    cdp.close();
  } finally {
    if (chrome.exitCode === null) {
      chrome.kill("SIGTERM");
      await Promise.race([once(chrome, "exit"), new Promise(resolvePromise => setTimeout(resolvePromise, 5_000))]);
    }
    await rm(profileDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 });
  }
}

await run();
