import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { once } from "node:events";
import { resolve } from "node:path";

const baseUrl = "http://127.0.0.1:3000";
const chromePort = 9227;
const statePath = resolve(".ui-e2e-state.json");
const artifactsDir = resolve(".ui-e2e-artifacts");
const email = "ui-review-e2e@example.invalid";
const password = "AhtarPass2026";

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
  const nextCookie = setCookies.map(value => value.split(";", 1)[0]).join("; ") || cookie;
  return { body: await response.json(), cookie: nextCookie };
}

function reportId(payload) {
  const id = payload?.result?.data?.json?.report?.id;
  assert(typeof id === "number", `تعذر استخراج معرّف البلاغ من الاستجابة: ${JSON.stringify(payload)}`);
  return id;
}

async function seed() {
  await rm(statePath, { force: true });
  let session = await rpc("auth.register", {
    name: "مستخدم اختبار الواجهة",
    email,
    password,
    role: "user",
  });
  assert(session.cookie.includes("app_session_id="), "لم يُنشأ ملف ارتباط جلسة اختبار الواجهة.");

  const source = await rpc("report.create", {
    reportType: "lost",
    itemKind: "item",
    name: "بلاغ المصدر لاختبار الواجهة",
    description: "محفظة اختبار عربية سوداء تحتوي على بطاقة ومفتاح للتحقق من رسائل الفشل.",
    incidentDate: "2026-08-18",
    location: "عتق",
    imageUrl: "",
    contactName: "مستخدم اختبار الواجهة",
    contactPhone: "777777777777",
  }, session.cookie);
  const candidate = await rpc("report.create", {
    reportType: "found",
    itemKind: "item",
    name: "بلاغ الهدف لاختبار الواجهة",
    description: "محفظة اختبار عربية سوداء تحتوي على بطاقة ومفتاح للتحقق من رسائل الفشل.",
    incidentDate: "2026-08-18",
    location: "عتق",
    imageUrl: "",
    contactName: "مستخدم اختبار الواجهة",
    contactPhone: "777777777777",
  }, session.cookie);

  const state = { email, cookie: session.cookie, sourceId: reportId(source.body), candidateId: reportId(candidate.body) };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  console.log(JSON.stringify(state));
}

class CdpClient {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
    ws.addEventListener("message", event => {
      const data = JSON.parse(event.data);
      if (data.id) {
        const pending = this.pending.get(data.id);
        if (!pending) return;
        this.pending.delete(data.id);
        if (data.error) pending.reject(new Error(data.error.message));
        else pending.resolve(data.result ?? {});
        return;
      }
      const handler = this.handlers.get(data.method);
      if (handler) handler(data.params);
    });
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await once(ws, "open");
    return new CdpClient(ws);
  }

  on(method, handler) {
    this.handlers.set(method, handler);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  close() {
    this.ws.close();
  }
}

async function waitFor(check, label, timeout = 10_000) {
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

function textClick(text, nth = 0) {
  return `(() => { const all = [...document.querySelectorAll('button, [role="button"]')].filter(node => (node.innerText || node.textContent || '').trim().includes(${JSON.stringify(text)})); if (!all[${nth}]) return false; all[${nth}].click(); return true; })()`;
}

function buttonPresent(text) {
  return `(() => [...document.querySelectorAll('button, [role="button"]')].some(node => (node.innerText || node.textContent || '').trim().includes(${JSON.stringify(text)})))()`;
}

async function run() {
  const state = JSON.parse(await readFile(statePath, "utf8"));
  await mkdir(artifactsDir, { recursive: true });
  const profile = resolve(".ui-e2e-chrome-profile");
  await rm(profile, { recursive: true, force: true });
  const chrome = spawn("chromium", [
    "--headless=new",
    "--no-sandbox",
    `--remote-debugging-port=${chromePort}`,
    `--user-data-dir=${profile}`,
    "about:blank",
  ], { stdio: "ignore" });

  try {
    let targets;
    await waitFor(async () => {
      try {
        targets = await (await fetch(`http://127.0.0.1:${chromePort}/json`)).json();
        return Array.isArray(targets) && targets.some(target => target.type === "page");
      } catch { return false; }
    }, "بدء متصفح الاختبار");
    const target = targets.find(item => item.type === "page");
    const client = await CdpClient.connect(target.webSocketDebuggerUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Network.enable");
    const cookieValue = state.cookie.split("=").slice(1).join("=");
    await client.send("Network.setCookie", { name: "app_session_id", value: cookieValue, url: baseUrl });

    const intercepted = new Map();
    const result = [];
    client.on("Fetch.requestPaused", async params => {
      const targetError = intercepted.get(params.request.url);
      if (!targetError) {
        await client.send("Fetch.continueRequest", { requestId: params.requestId });
        return;
      }
      const body = JSON.stringify([{ error: { json: { message: targetError.message, code: -32000, data: { code: "BAD_REQUEST", httpStatus: 400, path: targetError.procedure } } } }]);
      await client.send("Fetch.fulfillRequest", {
        requestId: params.requestId,
        responseCode: 400,
        responseHeaders: [{ name: "content-type", value: "application/json" }],
        body: Buffer.from(body).toString("base64"),
      });
    });
    await client.send("Fetch.enable", { patterns: [{ urlPattern: "*api/trpc/*", requestStage: "Request" }] });

    async function go(path, expectedText) {
      await client.send("Page.navigate", { url: `${baseUrl}${path}` });
      await waitFor(() => evaluate(client, `document.body?.innerText?.includes(${JSON.stringify(expectedText)})`), `ظهور ${expectedText}`);
    }

    async function verifyToast(name, mutationKey, procedure, message, click) {
      intercepted.clear();
      intercepted.set(`${baseUrl}/api/trpc/${mutationKey}?batch=1`, { procedure, message });
      const clicked = await evaluate(client, click);
      assert(clicked, `لم يُعثر على زر إجراء ${name}.`);
      await waitFor(() => evaluate(client, `document.body?.innerText?.includes(${JSON.stringify(message)})`), `تنبيه ${name}`);
      const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      await writeFile(resolve(artifactsDir, `${name}.png`), Buffer.from(screenshot.data, "base64"));
      result.push({ name, message, screenshot: `${name}.png` });
    }

    await go(`/reports/${state.sourceId}/edit`, "حدّث تفاصيل البلاغ");
    await waitFor(() => evaluate(client, buttonPresent("حفظ التعديلات")), "زر حفظ التعديلات");
    await verifyToast("edit-report", "report.update", "report.update", "تعذر تحديث البلاغ في اختبار الواجهة.", textClick("حفظ التعديلات"));

    await go("/my-reports", "بلاغاتي ومطابقاتي");
    await waitFor(() => evaluate(client, buttonPresent("تم الاسترجاع")), "زر الاسترجاع");
    await verifyToast("recover-report", "report.recover", "report.recover", "تعذر استرجاع البلاغ في اختبار الواجهة.", textClick("تم الاسترجاع"));

    await go(`/reports/${state.candidateId}`, "بلاغ الهدف لاختبار الواجهة");
    const matchOpened = await evaluate(client, textClick("الإبلاغ عن تطابق"));
    assert(matchOpened, "لم يُعثر على زر فتح نموذج التطابق.");
    await waitFor(() => evaluate(client, "document.body?.innerText?.includes('اختر أحد بلاغاتك للمقارنة')"), "نموذج اختيار بلاغ المطابقة");
    await waitFor(() => evaluate(client, buttonPresent("بلاغ المصدر لاختبار الواجهة")), "زر اختيار بلاغ المطابقة");
    await verifyToast("report-match", "report.reportMatch", "report.reportMatch", "تعذر الإبلاغ عن التطابق في اختبار الواجهة.", textClick("بلاغ المصدر لاختبار الواجهة"));

    await go("/admin", "مركز إدارة أثر");
    const reportsTab = await evaluate(client, textClick("إدارة البلاغات"));
    assert(reportsTab, "لم يُعثر على تبويب إدارة البلاغات.");
    await waitFor(() => evaluate(client, "document.body?.innerText?.includes('كل البلاغات')"), "قائمة إدارة البلاغات");
    await waitFor(() => evaluate(client, buttonPresent("مراجعة")), "زر مراجعة البلاغ");
    await verifyToast("admin-moderation", "report.moderate", "report.moderate", "تعذر تحديث حالة البلاغ في اختبار الواجهة.", textClick("مراجعة"));

    await go("/notifications", "إشعاراتك");
    await waitFor(() => evaluate(client, buttonPresent("تمت القراءة")), "إشعار غير مقروء");
    await verifyToast("notification-read", "notification.markRead", "notification.markRead", "تعذر تعليم الإشعار كمقروء في اختبار الواجهة.", textClick("تمت القراءة"));

    await writeFile(resolve(artifactsDir, "results.json"), `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify({ passed: result.length, results: result }, null, 2));
    client.close();
  } finally {
    if (chrome.exitCode === null) {
      chrome.kill("SIGTERM");
      await Promise.race([
        once(chrome, "exit"),
        new Promise(resolvePromise => setTimeout(resolvePromise, 5_000)),
      ]);
    }
    await rm(resolve(".ui-e2e-chrome-profile"), { recursive: true, force: true, maxRetries: 6, retryDelay: 250 });
  }
}

const command = process.argv[2];
if (command === "seed") await seed();
else if (command === "run") await run();
else throw new Error("استخدم: node scripts/ui-error-e2e.mjs seed | run");
