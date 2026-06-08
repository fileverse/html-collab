/**
 * Stand-in "AI-generated HTML" used to exercise the anchoring engine (M2).
 * Self-contained (inline CSS); sample 3 includes an inline <script> to prove
 * scripts execute inside the sandbox. Replaced by real imported files in M3.
 */
export type Sample = { id: string; name: string; html: string }

const landing = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Inter,system-ui,Arial,sans-serif;color:#111;background:#fff}
  nav{display:flex;align-items:center;justify-content:space-between;padding:22px 48px;border-bottom:1px solid #eee}
  nav .brand{font-weight:800;font-size:22px;letter-spacing:-.5px}
  nav a{margin-left:28px;color:#444;text-decoration:none;font-size:15px}
  .hero{padding:90px 48px}
  .hero h1{font-size:64px;line-height:1.02;font-weight:800;letter-spacing:-2px;max-width:900px}
  .hero p{margin-top:22px;font-size:19px;color:#666;max-width:520px}
  .hero .cta{margin-top:34px;display:inline-block;background:#111;color:#fff;padding:14px 26px;border-radius:999px;font-weight:600}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:40px 48px 90px}
  .card{border:1px solid #eee;border-radius:16px;padding:26px}
  .card h3{font-size:18px;margin-bottom:8px}
  .card p{color:#666;font-size:14px;line-height:1.5}
</style></head>
<body>
  <nav id="nav"><div class="brand">ONY</div>
    <div><a href="#">Projects</a><a href="#">Services</a><a href="#">About</a><a href="#">Contact</a></div>
  </nav>
  <header class="hero" id="hero">
    <h1 id="headline">Strategies, Branding and Digital products for companies who are ready for changes.</h1>
    <p id="subcopy">We help ambitious teams design products people love and brands they remember.</p>
    <a class="cta" href="#">Start a project</a>
  </header>
  <section class="grid">
    <div class="card"><h3>Brand strategy</h3><p>Positioning, messaging and identity systems that scale.</p></div>
    <div class="card"><h3>Product design</h3><p>End-to-end UX and UI for web and mobile products.</p></div>
    <div class="card"><h3>Engineering</h3><p>We ship resilient front-ends and design systems.</p></div>
  </section>
</body></html>`

const dashboard = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Inter,system-ui,Arial,sans-serif;display:flex;color:#111;background:#f7f7f8}
  aside{width:220px;min-height:100vh;background:#0f172a;color:#cbd5e1;padding:24px 18px}
  aside .logo{color:#fff;font-weight:800;font-size:18px;margin-bottom:28px}
  aside a{display:block;padding:10px 12px;border-radius:8px;color:#cbd5e1;text-decoration:none;font-size:14px;margin-bottom:4px}
  aside a.active{background:#1e293b;color:#fff}
  main{flex:1;padding:32px 36px}
  h1{font-size:26px;margin-bottom:24px}
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:28px}
  .stat{background:#fff;border:1px solid #eceef1;border-radius:14px;padding:20px}
  .stat .k{color:#64748b;font-size:13px}
  .stat .v{font-size:30px;font-weight:700;margin-top:6px}
  table{width:100%;background:#fff;border:1px solid #eceef1;border-radius:14px;border-collapse:collapse;overflow:hidden}
  th,td{text-align:left;padding:14px 18px;font-size:14px;border-bottom:1px solid #f1f5f9}
  th{color:#64748b;font-weight:600;background:#fafafa}
</style></head>
<body>
  <aside><div class="logo">Acme</div>
    <a class="active" href="#">Overview</a><a href="#">Customers</a><a href="#">Invoices</a><a href="#">Settings</a>
  </aside>
  <main>
    <h1 id="title">Revenue overview</h1>
    <div class="stats">
      <div class="stat"><div class="k">MRR</div><div class="v">$48,200</div></div>
      <div class="stat"><div class="k">Active users</div><div class="v">1,284</div></div>
      <div class="stat"><div class="k">Churn</div><div class="v">2.1%</div></div>
    </div>
    <table id="invoices"><thead><tr><th>Customer</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td>Globex</td><td>Scale</td><td>$1,200</td><td>Paid</td></tr>
        <tr><td>Initech</td><td>Pro</td><td>$480</td><td>Due</td></tr>
        <tr><td>Soylent</td><td>Pro</td><td>$480</td><td>Paid</td></tr>
      </tbody>
    </table>
  </main>
</body></html>`

const article = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;max-width:720px;margin:0 auto;padding:64px 24px;line-height:1.7}
  h1{font-size:42px;line-height:1.1;font-family:Inter,system-ui,sans-serif;letter-spacing:-1px}
  .meta{color:#888;font-family:Inter,system-ui,sans-serif;font-size:14px;margin:14px 0 36px}
  h2{font-size:26px;margin:38px 0 12px;font-family:Inter,system-ui,sans-serif}
  p{margin:16px 0;font-size:18px}
  ul{margin:16px 0 16px 22px}
  li{margin:6px 0;font-size:18px}
  blockquote{border-left:3px solid #111;margin:24px 0;padding:6px 18px;color:#444;font-style:italic}
</style></head>
<body>
  <h1 id="headline">The quiet comeback of local-first software</h1>
  <div class="meta">By A. Writer · <span id="readtime">… min read</span></div>
  <p id="lede">For a decade the cloud swallowed everything. Now a counter-current is gaining strength: software that works on your device first and syncs second.</p>
  <h2 id="why">Why it matters</h2>
  <p>Local-first apps stay fast and usable offline, keep data under the user's control, and still collaborate when a network is available.</p>
  <ul>
    <li>Instant interactions — no round-trip to a server.</li>
    <li>Ownership — your data lives with you.</li>
    <li>Resilience — the app keeps working when the network doesn't.</li>
  </ul>
  <blockquote id="quote">The network is an enhancement, not a dependency.</blockquote>
  <h2 id="tradeoffs">The trade-offs</h2>
  <p>Conflict resolution and sync are genuinely hard, but modern CRDTs have made them tractable for everyday apps.</p>
  <script>
    // proves scripts execute inside the sandbox
    var words = document.body.innerText.trim().split(/\\s+/).length;
    document.getElementById('readtime').textContent = Math.max(1, Math.round(words / 200)) + ' min read';
  </script>
</body></html>`

export const SAMPLES: Sample[] = [
  { id: 'landing', name: 'Landing (ONY)', html: landing },
  { id: 'dashboard', name: 'Dashboard', html: dashboard },
  { id: 'article', name: 'Article (+script)', html: article },
]
