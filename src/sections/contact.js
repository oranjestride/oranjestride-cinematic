// 8 · Contact / Closing — scrubbed portal, trust chips, contact tokens, Formspree form (§5.8).
import { contact } from '../data/content.js';
import { videoBlock, tokenIcon, $ } from '../utils/helpers.js';

const trustIco = ['check', 'cap', 'users', 'star'];

export function renderContact() {
  return `
  <section class="section video-section" id="contact" data-video="${contact.video}" data-scrub="true">
    ${videoBlock(contact.video, { scrub: true })}
    <div class="sec-content">
      <p class="section-label reveal" style="text-align:center;">${contact.label}</p>
      <h2 class="headline reveal" style="text-align:center;">${contact.headA}<span class="accent">${contact.headAccent}</span>${contact.headB}</h2>
      <p class="subhead reveal" style="text-align:center;margin:0 auto 2rem;">${contact.sub}</p>

      <div class="trust-row reveal" style="justify-content:center;">
        ${contact.trust.map((label, i) => `<span class="trust-chip">${tokenIcon(trustIco[i])}${label}</span>`).join('')}
      </div>

      <div class="contact-layout">
        <div>
          <div class="contact-tokens">
            ${contact.tokens.map((t) => `
              <div class="contact-token reveal">
                <span class="ico">${tokenIcon(t.icon)}</span>
                <div><strong>${t.strong}</strong><span>${t.span}</span></div>
              </div>`).join('')}
          </div>
        </div>

        <form class="form reveal" action="${contact.formAction}" method="POST">
          <div class="form-row">
            <label>Full Name<input type="text" name="name" class="form-input" placeholder="Your name" required /></label>
            <label>Organisation<input type="text" name="organisation" class="form-input" placeholder="Company / Institution" /></label>
          </div>
          <label>Email Address<input type="email" name="email" class="form-input" placeholder="you@organisation.com" required /></label>
          <label>Enquiry Type
            <select name="enquiry_type" class="form-input">
              <option value="">Select an option</option>
              ${contact.enquiryOptions.map((o) => `<option>${o}</option>`).join('')}
            </select>
          </label>
          <label>Message<textarea name="message" class="form-input" placeholder="Tell us about your goals or requirements..."></textarea></label>
          <button class="btn btn-primary" id="submitBtn" type="submit">Send Enquiry</button>
          <p class="form-status" id="form-status" role="status"></p>
        </form>
      </div>
    </div>
  </section>`;
}

export function initContact() {
  const form = $('#contact form');
  const status = $('#form-status');
  const btn = $('#submitBtn');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.className = 'form-status'; status.textContent = '';
    btn.textContent = 'Sending…'; btn.disabled = true;
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });
      if (!res.ok) throw new Error('bad response');
      status.className = 'form-status ok';
      status.textContent = "Thank you — your enquiry has been sent. We'll be in touch shortly.";
      form.reset();
    } catch (_) {
      status.className = 'form-status err';
      status.textContent = 'Something went wrong. Please email contactus@oranjestride.com directly.';
    } finally {
      btn.textContent = 'Send Enquiry'; btn.disabled = false;
    }
  });
}
