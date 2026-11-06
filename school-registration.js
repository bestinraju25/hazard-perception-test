/* HPT driving-school self-registration, static UPI payment and direct access-code recovery.
   Loaded after app.js. Existing HPT login, exam, results and school sessions are untouched. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function getSupabase() {
    if (window._sb) return window._sb;
    const config = window.RAJU_HPT_CONFIG;
    if (!window.supabase?.createClient || !config?.supabaseUrl || !config?.supabaseAnonKey) {
      throw new Error('The registration service is not ready. Refresh the page and try again.');
    }
    window._sb = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    return window._sb;
  }

  function ensureModal() {
    if ($('hptRegistrationModal')) return;
    const modal = document.createElement('div');
    modal.id = 'hptRegistrationModal';
    modal.className = 'hptRegistrationModal';
    modal.hidden = true;
    modal.innerHTML = `
      <section class="hptRegistrationDialog" role="dialog" aria-modal="true" aria-labelledby="hptRegistrationTitle">
        <button id="hptRegistrationClose" class="hptRegistrationClose" type="button" aria-label="Close">×</button>
        <div id="hptRegistrationContent"></div>
      </section>`;
    document.body.appendChild(modal);
    $('hptRegistrationClose').addEventListener('click', closeModal);
    modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !$('hptRegistrationModal').hidden) closeModal();
    });
  }

  function openModal(markup) {
    ensureModal();
    $('hptRegistrationContent').innerHTML = markup;
    $('hptRegistrationModal').hidden = false;
    $('hptRegistrationClose').focus();
  }

  function closeModal() {
    if ($('hptRegistrationModal')) $('hptRegistrationModal').hidden = true;
  }

  function showError(message) {
    const box = $('hptRegistrationError');
    if (box) {
      box.textContent = message || 'Something went wrong. Please try again.';
      box.hidden = false;
    }
  }

  function registrationForm() {
    openModal(`
      <div class="hptRegEyebrow">NEW SCHOOL REGISTRATION</div>
      <h2 id="hptRegistrationTitle">Register your driving school</h2>
      <p class="hptRegIntro">Enter the details below. You will receive a four-digit access code after completing the payment step.</p>
      <form id="hptSchoolRegistrationForm" class="hptRegForm">
        <label>Driving school name
          <input name="schoolName" type="text" maxlength="120" autocomplete="organization" placeholder="Enter driving school name" required>
        </label>
        <label>Location
          <input name="location" type="text" maxlength="120" autocomplete="address-level2" placeholder="Town / District" required>
        </label>
        <label>Registered contact number
          <input name="contactNumber" type="tel" inputmode="tel" maxlength="30" autocomplete="tel" placeholder="Enter mobile number" required>
        </label>
        <label>Driving school logo <span class="hptRegHint">PNG, JPG or WebP · maximum 5 MB</span>
          <input name="schoolLogo" type="file" accept="image/png,image/jpeg,image/webp" required>
        </label>
        <div id="hptRegistrationError" class="hptRegError" role="alert" hidden></div>
        <button class="hptRegPrimary" type="submit">CONTINUE TO PAYMENT <span>→</span></button>
      </form>`);

    $('hptSchoolRegistrationForm').addEventListener('submit', submitRegistration);
  }

  async function submitRegistration(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const file = form.elements.schoolLogo.files?.[0];
    if (!file) return showError('Please select your driving school logo.');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      return showError('Logo must be a PNG, JPG or WebP image.');
    }
    if (file.size > 5 * 1024 * 1024) return showError('Logo must be 5 MB or smaller.');

    const schoolName = form.elements.schoolName.value.trim();
    const location = form.elements.location.value.trim();
    const contactNumber = form.elements.contactNumber.value.trim();
    const digits = contactNumber.replace(/\D/g, '');
    if (schoolName.length < 2 || location.length < 2 || digits.length < 10 || digits.length > 15) {
      return showError('Enter a valid school name, location and contact number.');
    }

    submit.disabled = true;
    submit.textContent = 'SUBMITTING DETAILS…';
    let uploadedLogoPath = null;
    try {
      const supabase = getSupabase();
      const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const randomId = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      uploadedLogoPath = `public-registration/${randomId}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('hpt-school-logos')
        .upload(uploadedLogoPath, file, { upsert: false, contentType: file.type, cacheControl: '3600' });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('hpt-school-logos').getPublicUrl(uploadedLogoPath);
      const logoUrl = publicData?.publicUrl;
      if (!logoUrl) throw new Error('Could not prepare the school logo. Please try again.');

      const { data, error } = await supabase.rpc('register_hpt_school', {
        p_school_name: schoolName,
        p_location: location,
        p_contact_number: contactNumber,
        p_logo_url: logoUrl
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.school_id || !/^\d{4}$/.test(String(result.access_code || ''))) {
        throw new Error('Registration could not be completed. Please try again.');
      }
      paymentScreen(result);
    } catch (error) {
      console.error('HPT school registration failed:', error);
      showError(error?.message || 'Registration failed. Please try again.');
      submit.disabled = false;
      submit.innerHTML = 'CONTINUE TO PAYMENT <span>→</span>';
    }
  }

  function paymentScreen(registration) {
    openModal(`
      <div class="hptRegEyebrow">REGISTRATION PAYMENT</div>
      <h2 id="hptRegistrationTitle">Pay ₹5,000</h2>
      <p class="hptRegIntro">Scan the QR code using Google Pay, PhonePe, Paytm or any UPI app.</p>
      <img class="hptPaymentQr" src="assets/gpay-payment-qr.png" alt="UPI QR code for payment to bestinraju25-2@oksbi">
      <div class="hptUpiId">UPI ID: <strong>bestinraju25-2@oksbi</strong></div>
      <p class="hptPaymentReminder">After completing the payment, press the button below. Your registration will remain pending until the administrator checks the payment and enables the school.</p>
      <div id="hptRegistrationError" class="hptRegError" role="alert" hidden></div>
      <button id="hptPaymentCompleted" class="hptRegPrimary" type="button">PAYMENT COMPLETED <span>✓</span></button>`);

    $('hptPaymentCompleted').addEventListener('click', async () => {
      const completedButton = $('hptPaymentCompleted');
      completedButton.disabled = true;
      completedButton.textContent = 'SUBMITTING CONFIRMATION…';
      try {
        const { data, error } = await getSupabase().rpc('confirm_hpt_school_payment', {
          p_school_id: registration.school_id
        });
        if (error) throw error;
        const confirmation = Array.isArray(data) ? data[0] : data;
        if (!confirmation?.ok) throw new Error(confirmation?.message || 'Could not submit payment confirmation. Please try again.');
      } catch (error) {
        console.error('HPT payment confirmation failed:', error);
        showError(error?.message || 'Could not submit payment confirmation. Please try again.');
        completedButton.disabled = false;
        completedButton.innerHTML = 'PAYMENT COMPLETED <span>✓</span>';
        return;
      }
      openModal(`
        <div class="hptRegSuccessIcon" aria-hidden="true">✓</div>
        <div class="hptRegEyebrow">REGISTRATION SUBMITTED</div>
        <h2 id="hptRegistrationTitle">Your access code is ready</h2>
        <p class="hptRegIntro">Keep this four-digit code safe. It will work only after your school is manually enabled by the administrator.</p>
        <div class="hptIssuedCode">${esc(registration.access_code)}</div>
        <div class="hptPendingNotice"><strong>STATUS: PENDING APPROVAL</strong><span>Payment will be checked manually before access is enabled.</span></div>
        <button id="hptRegistrationDone" class="hptRegPrimary" type="button">DONE</button>`);
      $('hptRegistrationDone').addEventListener('click', closeModal);
    });
  }

  function forgotAccessCode() {
    openModal(`
      <div class="hptRegEyebrow">EXISTING DRIVING SCHOOLS</div>
      <h2 id="hptRegistrationTitle">Forgot Access Code?</h2>
      <p class="hptRegIntro">Enter the registered mobile number to retrieve the access code associated with it.</p>
      <form id="hptRecoverAccessForm" class="hptRegForm">
        <label>Registered mobile number
          <input name="contactNumber" type="tel" inputmode="tel" maxlength="30" autocomplete="tel" placeholder="Enter registered mobile number" required>
        </label>
        <div id="hptRegistrationError" class="hptRegError" role="alert" hidden></div>
        <button class="hptRegPrimary" type="submit">SHOW ACCESS CODE <span>→</span></button>
      </form>
      <p class="hptRecoveryPrivacy">Access-code recovery is based on the registered mobile number and does not use OTP verification.</p>`);

    $('hptRecoverAccessForm').addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      const contactNumber = form.elements.contactNumber.value.trim();
      button.disabled = true;
      button.textContent = 'LOOKING UP…';
      try {
        const { data, error } = await getSupabase().rpc('recover_hpt_school_access_code', {
          p_contact_number: contactNumber
        });
        if (error) throw error;
        const result = Array.isArray(data) ? data[0] : data;
        if (!result?.found || !Array.isArray(result.schools) || !result.schools.length) {
          throw new Error('No school was found for that registered mobile number.');
        }
        const cards = result.schools.map(school => `
          <article class="hptRecoveredSchool">
            <strong>${esc(school.school_name)}</strong>
            <div class="hptRecoveredCode">${esc(school.access_code)}</div>
            <span class="hptRecoveredStatus ${school.active ? 'isActive' : 'isPending'}">${school.active ? 'ACTIVE' : 'PENDING / DISABLED — CONTACT ADMIN FOR ACTIVATION'}</span>
          </article>`).join('');
        openModal(`
          <div class="hptRegEyebrow">ACCESS CODE RECOVERY</div>
          <h2 id="hptRegistrationTitle">Your registered school codes</h2>
          <p class="hptRegIntro">The following school record(s) match the mobile number you entered.</p>
          <div class="hptRecoveredList">${cards}</div>
          <button id="hptRecoveryDone" class="hptRegPrimary" type="button">DONE</button>`);
        $('hptRecoveryDone').addEventListener('click', closeModal);
      } catch (error) {
        console.error('HPT access-code recovery failed:', error);
        showError(error?.message || 'Could not retrieve the access code. Please try again.');
        button.disabled = false;
        button.innerHTML = 'SHOW ACCESS CODE <span>→</span>';
      }
    });
  }

  function init() {
    const getAccessButton = $('hptGetAccess');
    const forgotButton = $('hptForgotAccess');
    if (getAccessButton) getAccessButton.addEventListener('click', registrationForm);
    if (forgotButton) forgotButton.addEventListener('click', forgotAccessCode);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
