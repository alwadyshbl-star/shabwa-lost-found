import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = "http://127.0.0.1:3000";
const chromePort = 9228;
const artifactsDir = resolve(".settings-ui-e2e-artifacts");
const profileDir = resolve(".settings-ui-e2e-profile");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function rpc(path, input, cookie = "") {
  const response = await fetch(`${baseUrl}/api/trpc/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ json: input }),
  });
  const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  return { body: await response.json(), cookie: setCookies.map(value => value.split(";", 1)[0]).join("; ") || cookie };
}

class CdpClient {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    ws.addEventListener("message", event => {
      const data = JSON.parse(event.data);
      if (!data.id) return;
      const pending = this.pending.get(data.id);
      if (!pending) return;
      this.pending.delete(data.id);
      if (data.error) pending.reject(new Error(data.error.message));
      else pending.resolve(data.result ?? {});
    });
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await once(ws, "open");
    return new CdpClient(ws);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolvePromise, reject) => this.pending.set(id, { resolve: resolvePromise, reject }));
  }

  close() {
    this.ws.close();
  }
}

async function waitFor(check, label, timeout = 12_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await check()) return;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 120));
  }
  throw new Error(`انتهت مهلة انتظار: ${label}`);
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return result.result.value;
}

function setInput(index, value) {
  return `(() => { const input = document.querySelectorAll('input')[${index}]; if (!input) return false; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;
}

function textClick(text, nth = 0) {
  return `(() => { const all = [...document.querySelectorAll('button, [role="button"]')].filter(node => (node.innerText || node.textContent || '').trim().includes(${JSON.stringify(text)})); if (!all[${nth}]) return false; all[${nth}].click(); return true; })()`;
}

async function run() {
  const stamp = Date.now();
  const email = `settings-ui-${stamp}@example.invalid`;
  const originalPassword = "AhtarPass2026";
  const newPassword = "NewAhtarPass2026";
  const created = await rpc("auth.register", { name: "اختبار واجهة الإعدادات", email, password: originalPassword, role: "user" });
  assert(created.cookie.includes("app_session_id="), "تعذر إنشاء جلسة اختبار الإعدادات.");

  await rm(artifactsDir, { recursive: true, force: true });
  await rm(profileDir, { recursive: true, force: true });
  await mkdir(artifactsDir, { recursive: true });
  const chrome = spawn("chromium", ["--headless=new", "--no-sandbox", `--remote-debugging-port=${chromePort}`, `--user-data-dir=${profileDir}`, "about:blank"], { stdio: "ignore" });
  try {
    let targets;
    await waitFor(async () => {
      try {
        targets = await (await fetch(`http://127.0.0.1:${chromePort}/json`)).json();
        return Array.isArray(targets) && targets.some(target => target.type === "page");
      } catch { return false; }
    }, "بدء متصفح اختبار الإعدادات");
    const client = await CdpClient.connect(targets.find(target => target.type === "page").webSocketDebuggerUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    const cookieValue = created.cookie.split("=").slice(1).join("=");
    await client.send("Network.setCookie", { name: "app_session_id", value: cookieValue, url: baseUrl });
    await client.send("Page.navigate", { url: `${baseUrl}/settings` });
    await waitFor(() => evaluate(client, `document.body?.innerText?.includes(${JSON.stringify(email)}) && document.body?.innerText?.includes('إعدادات الحساب')`), "تحميل صفحة الإعدادات بالجلسة المسجلة");
    const desktopShot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    await writeFile(resolve(artifactsDir, "settings-desktop.png"), Buffer.from(desktopShot.data, "base64"));

    assert(await evaluate(client, setInput(0, originalPassword)), "تعذر ملء كلمة المرور الحالية.");
    assert(await evaluate(client, setInput(1, newPassword)), "تعذر ملء كلمة المرور الجديدة.");
    assert(await evaluate(client, setInput(2, "MismatchPassword2026")), "تعذر ملء تأكيد كلمة المرور.");
    assert(await evaluate(client, textClick("حفظ كلمة المرور الجديدة")), "لم يُعثر على زر حفظ كلمة المرور.");
    await waitFor(() => evaluate(client, "document.body?.innerText?.includes('تأكيد كلمة المرور لا يطابق كلمة المرور الجديدة.')"), "رسالة عدم تطابق كلمة المرور");

    assert(await evaluate(client, setInput(0, "wrong-password")), "تعذر اختبار كلمة المرور الحالية الخاطئة.");
    assert(await evaluate(client, setInput(2, newPassword)), "تعذر تصحيح تأكيد كلمة المرور.");
    assert(await evaluate(client, textClick("حفظ كلمة المرور الجديدة")), "لم يُعثر على زر حفظ كلمة المرور لإرسال الاختبار.");
    await waitFor(() => evaluate(client, "document.body?.innerText?.includes('كلمة المرور الحالية غير صحيحة.')"), "رسالة كلمة المرور الحالية الخاطئة");

    assert(await evaluate(client, textClick("حذف حسابي نهائيًا")), "لم يُعثر على زر فتح حذف الحساب.");
    await waitFor(() => evaluate(client, "document.body?.innerText?.includes('تأكيد حذف الحساب')"), "نافذة تأكيد الحذف");
    assert(await evaluate(client, setInput(3, originalPassword)), "تعذر ملء كلمة مرور الحذف.");
    assert(await evaluate(client, setInput(4, "حذف")), "تعذر ملء عبارة الحذف الخاطئة.");
    assert(await evaluate(client, textClick("حذف الحساب نهائيًا")), "لم يُعثر على زر تنفيذ الحذف.");
    await waitFor(() => evaluate(client, "document.body?.innerText?.includes('اكتب «حذف حسابي» لتأكيد الحذف النهائي.')"), "رسالة عبارة الحذف الخاطئة");

    await client.send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
    const mobileShot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    await writeFile(resolve(artifactsDir, "settings-mobile.png"), Buffer.from(mobileShot.data, "base64"));
    await client.send("Emulation.clearDeviceMetricsOverride");

    assert(await evaluate(client, setInput(3, originalPassword)), "تعذر إعادة ملء كلمة مرور الحذف.");
    assert(await evaluate(client, setInput(4, "حذف حسابي")), "تعذر ملء عبارة الحذف النهائية.");
    assert(await evaluate(client, textClick("حذف الحساب نهائيًا")), "لم يُعثر على زر الحذف النهائي.");
    await waitFor(() => evaluate(client, "window.location.pathname === '/'"), "العودة إلى الصفحة الرئيسية بعد الحذف");

    const result = { email, desktop: "settings-desktop.png", mobile: "settings-mobile.png", checks: ["account-information", "password-mismatch", "wrong-current-password", "delete-confirmation", "delete-and-logout"] };
    await writeFile(resolve(artifactsDir, "results.json"), `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify({ passed: result.checks.length, checks: result.checks }, null, 2));
    client.close();
  } finally {
    if (chrome.exitCode === null) {
      chrome.kill("SIGTERM");
      await Promise.race([once(chrome, "exit"), new Promise(resolvePromise => setTimeout(resolvePromise, 5_000))]);
    }
    await rm(profileDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 });
  }
}

await run();
