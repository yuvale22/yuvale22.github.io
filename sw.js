/* ══════════════════════════════════════════════════════════
   לצידך · Service Worker

   שלושה תפקידים:
   1. להפוך את האתר לאפליקציה שניתן להתקין במסך הבית
   2. לתת מסך פתיחה סביר כשאין רשת
   3. לטפל בלחיצה על התראה — לפתוח את האפליקציה במקום עוד לשונית

   ⚠ בכוונה אין כאן שמירה במטמון של מידע מהתיק.
     נשמר רק מעטפת האפליקציה. שום פרט רפואי לא יורד לדיסק.
   ══════════════════════════════════════════════════════════ */

const V = 'latzidcha-v1';
const SHELL = ['./', './index.html', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V)
      .then(c => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;

  const url = new URL(r.url);
  // רק הקבצים שלנו. קריאות לסופאבייס תמיד ישירות לרשת.
  if (url.origin !== self.location.origin) return;

  // רשת קודם, מטמון כגיבוי — כדי שגרסה חדשה תתפוס מיד
  e.respondWith(
    fetch(r)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(V).then(c => c.put(r, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(r).then(m => m || caches.match('./index.html')))
  );
});

/* לחיצה על התראה — מעבירה ללשונית פתוחה אם יש אחת */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(list => {
        for (const c of list) {
          if ('focus' in c) return c.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow('./');
      })
  );
});

/* Web Push — מוכן לרגע שיהיה שרת שישלח.
   ⚠ ההודעה לא מכילה פרטים רפואיים, רק כותרת וקישור. */
self.addEventListener('push', e => {
  let d = { title: 'לצידך', body: 'יש עדכון בתיק שלך' };
  try { if (e.data) d = Object.assign(d, e.data.json()); } catch (_) {}
  e.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      dir: 'rtl',
      lang: 'he',
      tag: d.tag || 'latzidcha',
      renotify: true
    })
  );
});
