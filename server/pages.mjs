// Public pages the stores require: privacy policy, terms of use, support, and data erasure.
// Served by the API so they live wherever it does — the app links to `${API_URL}/privacy` etc.
const UPDATED = 'November 12, 2026';
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

// The Manendi mark: a seal with a 90° gap (the clock), a doorway, and you inside it.
const MARK = `<svg width="40" height="40" viewBox="0 0 1024 1024" aria-hidden="true"><path d="M872 512A360 360 0 1 1 512 152" fill="none" stroke="#E2B54A" stroke-width="64"/><path d="M394 712V502a118 118 0 0 1 236 0v210" fill="none" stroke="var(--green)" stroke-width="64"/><circle cx="512" cy="640" r="46" fill="#E4572E"/></svg>`;

const shell = (title, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Manendi</title><meta name="color-scheme" content="light dark">
<style>
:root{--bg:#F7F4EC;--card:#fff;--text:#0F1B2D;--muted:#5E6878;--line:#E6DFD0;--green:#1E8C66;--gold:#B8860B;--stamp:#D9481F}
@media (prefers-color-scheme:dark){:root{--bg:#0B1320;--card:#142033;--text:#F3EFE6;--muted:#93A0B2;--line:#22324A;--green:#3CCB98;--gold:#F2C661;--stamp:#FF7A50}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:720px;margin:0 auto;padding:28px 18px 64px}a{color:var(--green)}
.brand{display:flex;align-items:center;gap:10px;font:400 30px/1 Georgia,serif;color:var(--text);text-decoration:none;letter-spacing:-.5px}
nav{display:flex;flex-wrap:wrap;gap:6px 16px;margin:14px 0 26px;font-size:14px}nav a{color:var(--muted);text-decoration:none}nav a:hover{color:var(--text)}
h1{font:400 38px/1.15 Georgia,serif;margin:0 0 6px;letter-spacing:-.5px}h2{font-size:18px;margin:30px 0 6px}.muted{color:var(--muted)}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 18px;margin:16px 0}ul{padding-left:20px}li{margin:4px 0}
footer{margin-top:40px;font-size:13px;color:var(--muted)}
</style></head><body><main>
<a class="brand" href="/support" aria-label="Manendi">${MARK}manendi</a>
<nav><a href="/support">Support</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/erase">Erase your data</a></nav>
${body}
<footer>Last updated ${UPDATED}</footer>
</main></body></html>`;

export function pages({ supportEmail, legalName, address = '' }) {
  const email = `<a href="mailto:${esc(supportEmail)}">${esc(supportEmail)}</a>`;
  const us = esc(legalName);
  // Apple's minimum EULA terms ask for the developer's name and address.
  const contact = `<div class="card">Contact: ${us}${address ? ` · ${esc(address)}` : ''} · ${email}</div>`;

  const privacy = shell('Privacy Policy', `
<h1>Privacy Policy</h1>
<p class="muted">Manendi keeps track of the dates that keep you in status. Immigration details are among the most sensitive things a person has, so Manendi is built to keep them on your phone. Here is exactly what stays with you, what reaches us, and why. Manendi is run by ${us} (“we”, “us”). Questions: ${email}.</p>

<h2>What stays on your phone — and never reaches us</h2>
<ul>
<li>The people you add and their names, relationships, nationality and immigration status.</li>
<li>Every date you enter (I-94, passport, visa, work permit, OPT, green card and others), your jobs and your trips.</li>
<li>Photos of documents in the vault, which is locked with Face ID, Touch ID or your device passcode.</li>
<li>Your green-card queue details (category, chargeability, priority date).</li>
</ul>
<p>This data lives in Manendi’s private storage on your device. If you turn on device backups (iCloud or Google), your phone includes it in those backups, under your account. Deleting the app deletes it from the phone.</p>

<h2>What reaches us</h2>
<ul>
<li><b>A random device key.</b> Your app makes one on first launch. It is not your name, email or phone number — Manendi has no accounts.</li>
<li><b>Receipt numbers you choose to watch</b>, the label you give each one, and the case status USCIS returns for it. We use them only to look up those cases through USCIS’s official Case Status API on your behalf and to tell you when they change. You can remove a case or erase everything at any time.</li>
<li><b>A push token</b>, if you allow notifications, so we can alert you when a watched case changes.</li>
<li><b>Plan status.</b> Whether you have Manendi Plus. Apple or Google take the payment — we never see card details. RevenueCat, our subscription service, receives the same random ID (not your name or email) and the purchase records Apple or Google provide.</li>
<li><b>Technical data.</b> Our servers and hosting providers process your IP address and basic request details to run and protect the service.</li>
</ul>
<p>The policy radar is public Federal Register data. Loading it sends nothing about you. We use no analytics or advertising SDKs, and we don’t track you across apps or websites.</p>

<h2>How we use it</h2>
<ul><li>To check the cases you watch and alert you when they change.</li><li>To provide Manendi Plus.</li>
<li>To keep the service secure (for example, limiting repeated requests) and to answer support requests.</li><li>To meet legal obligations.</li></ul>
<p>We don’t sell your data, use it for advertising, or use it to train AI models.</p>

<h2>Who can see it</h2>
<ul>
<li><b>USCIS</b>, which receives a receipt number when we look it up for you, through its official API.</li>
<li><b>Service providers</b> that process data for us under contract and only to provide their service: MongoDB Atlas (database), our application host, RevenueCat (subscriptions), Apple and Google (purchases and push notifications), and Expo (push delivery).</li>
<li><b>Legal requests.</b> We disclose information only when the law, a subpoena or a court order requires it. Because your status, dates, trips and documents never leave your phone, we don’t have them to give. Where allowed, we tell you first.</li>
</ul>

<h2>Keeping and erasing data</h2>
<p>We keep a watched case until you remove it. Erase everything we hold for your device at any time in the app (Family → Erase my server data) or as described on <a href="/erase">Erase your data</a>. Device records inactive for 12 months are deleted automatically. Residual copies may remain in encrypted backups for a limited time before they are overwritten.</p>

<h2>Security</h2>
<p>Data is encrypted in transit (HTTPS) and at rest by our database provider. Your device key is stored hashed on our side and in your phone’s secure keychain or keystore. No system is perfect — if you find a problem, tell us at ${email}.</p>

<h2>Children</h2>
<p>Manendi is for adults. Parents can add their children so the family’s dates live in one place; that information stays on the parent’s phone. We don’t knowingly collect personal information from children.</p>

<h2>Your rights</h2>
<p>Depending on where you live (for example under the GDPR in the EU and UK, or the CCPA in California), you can access, correct, export or delete your data, restrict or object to its use, and withdraw consent. Most of it is already in your hands on your phone; for what we hold, use Erase my server data or email ${email} and we will respond within 30 days. You may also complain to your local data-protection authority. Our providers may process data in the United States and other countries with appropriate safeguards.</p>

<h2>Changes</h2>
<p>If we change this policy we will update the date below, and tell you in the app if the change is significant.</p>
${contact}`);

  const terms = shell('Terms of Use', `
<h1>Terms of Use</h1>
<p class="muted">The short version: Manendi organises dates and information so nothing sneaks up on you. It is not a lawyer. Manendi is provided by ${us}. By using Manendi you agree to these Terms and the <a href="/privacy">Privacy Policy</a>.</p>

<h2>1. Information, not legal advice</h2>
<p>Manendi calculates dates from the information you enter and from published rules, and links the official source for each one. It does not give legal advice, it doesn’t create an attorney–client relationship, and it can’t know everything about your case. Immigration rules change and have exceptions. Check important decisions with your DSO, your employer’s immigration team or a licensed immigration attorney, and rely on official notices from USCIS, CBP and the Department of State.</p>

<h2>2. Your information</h2>
<p>You are responsible for the accuracy of what you enter. Most of it stays on your device; you are responsible for keeping your device secure and backed up. Only enter receipt numbers that belong to you or to people who have agreed to you tracking their case.</p>

<h2>3. Case status</h2>
<p>Case statuses come from USCIS’s official Case Status API. We don’t control it, and it may be delayed, incomplete or unavailable. A missing or late alert doesn’t change a USCIS deadline — always read the notices USCIS mails you.</p>

<h2>4. Use it fairly</h2>
<p>No attempts to look up cases that aren’t yours or your family’s, to overload or reverse-engineer the service, or to use it for anything illegal.</p>

<h2>5. Manendi Plus subscription</h2>
<ul>
<li>Manendi Plus is an optional auto-renewing subscription, billed monthly or yearly.</li>
<li>The price is shown in the app before you buy and may vary by country. Payment is charged to your Apple Account or Google Play account when you confirm.</li>
<li>It renews automatically unless cancelled at least 24 hours before the end of the current period; renewal is charged within the 24 hours before the period ends.</li>
<li>Manage or cancel in your App Store or Google Play account settings. Deleting the app does not cancel the subscription.</li>
<li>Refunds are handled by Apple or Google under their policies. After cancelling, Plus features stay on until the paid period ends.</li>
</ul>

<h2>6. Availability and changes</h2>
<p>We work hard to keep Manendi running but can’t promise it will always be available or error-free. We may change or retire features. If we ever shut Manendi down we will give at least 30 days’ notice.</p>

<h2>7. Disclaimers and liability</h2>
<p>To the extent the law allows, Manendi is provided “as is”, we are not liable for indirect or consequential losses — including missed deadlines, lost status or immigration outcomes — and our total liability is limited to what you paid us in the 12 months before the claim. Nothing here limits liability that the law does not allow to be limited.</p>

<h2>8. If you got Manendi from the App Store</h2>
<p>These Terms are between you and ${us}, not Apple. Apple has no obligation to provide maintenance or support for Manendi. To the maximum extent the law allows, Apple has no warranty obligation for Manendi; if it fails to conform to an applicable warranty you may notify Apple for a refund of any purchase price. Apple is not responsible for claims relating to Manendi, including product liability, legal or regulatory compliance and consumer protection claims, or for investigating or defending intellectual-property claims. You confirm you are not located in a country subject to a U.S. Government embargo and are not on any U.S. Government list of prohibited or restricted parties. Apple and its subsidiaries are third-party beneficiaries of these Terms and may enforce them. Purchases through Google Play are also subject to Google Play’s terms.</p>

<h2>9. Changes to these Terms</h2>
<p>We may update these Terms. We will change the date below and tell you in the app about significant changes. Continuing to use Manendi means you accept the updated Terms.</p>

<h2>10. Governing law</h2>
<p>These Terms are governed by the laws of the place where ${us} is established, except where the law where you live gives you rights that can’t be waived.</p>
${contact}`);

  const support = shell('Support', `
<h1>We’re here.</h1>
<p class="muted">Real people answer. Email ${email} — we reply within 1–2 business days.</p>
<div class="card"><b>Facing a deadline in the next few days?</b> Manendi can’t file anything for you or give legal advice. Contact your DSO, your employer’s immigration team or a licensed immigration attorney now.</div>
<h2>Where are my details stored?</h2><p>On your phone. Manendi has no accounts. Only receipt numbers you choose to watch reach our servers.</p>
<h2>Moving to a new phone</h2><p>Restore your old phone’s iCloud or Google backup onto the new one and Manendi comes with it. Watched cases re-attach the first time you open the app.</p>
<h2>Why isn’t my case updating?</h2><p>Live case status comes from USCIS’s official API. Until it is switched on for your app version, tap Check on USCIS and log the update — Manendi keeps the history and explains each step.</p>
<h2>Manendi Plus</h2><p>Plus adds your whole family, unlimited watched cases with change alerts, the citizenship travel budget, the document vault and status reports.</p>
<h2>Cancel or change your plan</h2><p>iPhone: Settings → your name → Subscriptions → Manendi. Android: Google Play → profile → Payments &amp; subscriptions → Subscriptions → Manendi.</p>
<h2>Restore a purchase</h2><p>Family → Manendi Plus → Restore purchases.</p>
<h2>Erase your data</h2><p>See <a href="/erase">Erase your data</a>.</p>`);

  const erase = shell('Erase your data', `
<h1>Erase your Manendi data</h1>
<p class="muted">Manendi, by ${us}. Manendi has no accounts, and most of your data never leaves your phone.</p>
<h2>What we hold</h2>
<p>Only receipt numbers you chose to watch (with their labels and USCIS statuses), a push token if you allowed notifications, a random device key, and your plan status.</p>
<h2>Erase it in the app (fastest)</h2>
<p>Open Manendi → <b>Family</b> → <b>Erase my server data</b>. It happens immediately. To remove everything on the phone too, choose <b>Erase everything</b>, or delete the app.</p>
<h2>Can’t open the app?</h2>
<p>Email ${email} with the subject “Erase my Manendi data” and the receipt numbers you watched. We erase them within 30 days — usually within 2 business days.</p>
<h2>What isn’t affected</h2>
<ul><li>Subscriptions are billed by Apple or Google — cancel them in your store account. Their purchase records follow their own policies.</li>
<li>Your cases at USCIS are untouched. Erasing only stops Manendi from watching them.</li></ul>`);

  return { privacy, terms, support, erase };
}
