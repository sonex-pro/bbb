/**
 * member-verification.js
 * -----------------------------------------------------------------------
 * Member verification flow for beginner.html
 *
 * Attach this script to beginner.html (after the Appwrite Web SDK) and it
 * will intercept clicks on the three booking-choice buttons, ask the user
 * for their Member ID, look it up in Appwrite, and — once confirmed —
 * hand control back to the booking flow.
 *
 * REQUIRES: Appwrite Web SDK, loaded before this file, e.g.
 *   <script src="https://cdn.jsdelivr.net/npm/appwrite@15.0.0"></script>
 *   <script src="member-verification.js"></script>
 *
 * SETUP: fill in the CONFIG block below with your project's real values.
 * -----------------------------------------------------------------------
 */

(function () {
  "use strict";

  // ======================================================================
  // CONFIG — replace these placeholders with your actual Appwrite values
  // ======================================================================
  const CONFIG = {
    endpoint: "https://fra.cloud.appwrite.io/v1",
    projectId: "6a49238a000491abb4d9",
    databaseId: "6a4923ce0020d9a64cd6",
    collectionId: "member_verification",
    memberIdField: "id_from_bbb",
  };

  // Selectors for the three trigger buttons in beginner.html.
  // Preferred: add data-booking-choice="..." to each button.
  // Falls back to matching on visible button text if attributes aren't present.
  const BUTTON_SELECTORS = [
    { selector: '[data-booking-choice="2-3-sessions"]', fallbackText: "Choose 2/3 sessions per week", choice: "2-3-sessions" },
    { selector: '[data-booking-choice="1-session"]', fallbackText: "Choose 1 session per week", choice: "1-session" },
    { selector: '[data-booking-choice="calendar"]', fallbackText: "Show calendar to book", choice: "calendar" },
  ];

  const SESSION_STORAGE_KEY = "bbb_member_id";
  const SESSION_STORAGE_NAME_KEY = "bbb_member_name";
  const SESSION_STORAGE_TTE_KEY = "bbb_member_tte";
  const SESSION_STORAGE_CHOICE_KEY = "bbb_booking_choice";

  let appwriteClient = null;
  let appwriteDatabases = null;

  function getAppwrite() {
    if (appwriteDatabases) return appwriteDatabases;

    if (!window.Appwrite) {
      console.error(
        "[member-verification] Appwrite SDK not found. Load it before member-verification.js."
      );
      return null;
    }

    const { Client, Databases } = window.Appwrite;
    appwriteClient = new Client()
      .setEndpoint(CONFIG.endpoint)
      .setProject(CONFIG.projectId);
    appwriteDatabases = new Databases(appwriteClient);
    return appwriteDatabases;
  }

  // ======================================================================
  // Modal markup / styling — injected once, reused for every verification
  // ======================================================================
  const MODAL_ID = "member-verification-modal";

  function injectStyles() {
    if (document.getElementById("member-verification-styles")) return;

    const style = document.createElement("style");
    style.id = "member-verification-styles";
    style.textContent = `
      #${MODAL_ID}-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-family: inherit;
      }
      #${MODAL_ID} {
        background: #fff;
        border-radius: 12px;
        padding: 28px 26px;
        width: 90%;
        max-width: 380px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.25);
        text-align: center;
      }
      #${MODAL_ID} h2 {
        margin: 0 0 6px;
        font-size: 1.25rem;
      }
      #${MODAL_ID} p.mv-instructions {
        margin: 0 0 18px;
        font-size: 0.9rem;
        color: #555;
      }
      #${MODAL_ID} input[type="text"] {
        width: 100%;
        box-sizing: border-box;
        padding: 10px 12px;
        font-size: 1rem;
        border: 1px solid #ccc;
        border-radius: 8px;
        margin-bottom: 12px;
        text-transform: uppercase;
      }
      #${MODAL_ID} .mv-error {
        color: #c0392b;
        font-size: 0.88rem;
        min-height: 1.2em;
        margin-bottom: 10px;
      }
      #${MODAL_ID} .mv-confirmation {
        font-size: 1rem;
        margin-bottom: 18px;
        line-height: 1.5;
      }
      #${MODAL_ID} .mv-buttons {
        display: flex;
        gap: 10px;
        justify-content: center;
      }
      #${MODAL_ID} button {
        cursor: pointer;
        border: none;
        border-radius: 8px;
        padding: 10px 18px;
        font-size: 0.95rem;
        font-weight: 600;
      }
      #${MODAL_ID} .mv-primary {
        background: #2563eb;
        color: #fff;
      }
      #${MODAL_ID} .mv-primary:disabled {
        background: #93b4f0;
        cursor: not-allowed;
      }
      #${MODAL_ID} .mv-secondary {
        background: #eee;
        color: #333;
      }
      #${MODAL_ID} .mv-close {
        position: absolute;
        top: 10px;
        right: 14px;
        background: none;
        font-size: 1.2rem;
        color: #888;
        padding: 2px 6px;
      }
      #${MODAL_ID}-overlay .mv-panel {
        position: relative;
      }
      #${MODAL_ID} .mv-loading {
        font-size: 0.9rem;
        color: #555;
        margin-bottom: 10px;
      }
    `;
    document.head.appendChild(style);
  }

  function removeModal() {
    const overlay = document.getElementById(MODAL_ID + "-overlay");
    if (overlay) overlay.remove();
  }

  /**
   * Renders the "enter member ID" step.
   */
  function renderEntryStep(bookingChoice) {
    removeModal();
    injectStyles();

    const overlay = document.createElement("div");
    overlay.id = MODAL_ID + "-overlay";
    overlay.innerHTML = `
      <div class="mv-panel" id="${MODAL_ID}" role="dialog" aria-modal="true" aria-labelledby="mv-title">
        <button class="mv-close" type="button" aria-label="Close">&times;</button>
        <h2 id="mv-title">Member Verification</h2>
        <p class="mv-instructions">
          Please enter your initials and first 3 numbers of your TTE number.
          Example ID: AB321
        </p>
        <input type="text" id="mv-member-id-input" placeholder="e.g. AB321" maxlength="10" autocomplete="off" />
        <div class="mv-error" id="mv-error-text"></div>
        <div class="mv-buttons">
          <button type="button" class="mv-primary" id="mv-submit-btn">Verify</button>
          <button type="button" class="mv-secondary" id="mv-cancel-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = document.getElementById("mv-member-id-input");
    const errorText = document.getElementById("mv-error-text");
    const submitBtn = document.getElementById("mv-submit-btn");

    input.focus();

    function submit() {
      const memberId = input.value.trim().toUpperCase();
      if (!memberId) {
        errorText.textContent = "Please enter your Member ID.";
        return;
      }
      errorText.textContent = "";
      verifyMember(memberId, bookingChoice);
    }

    submitBtn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });

    document.getElementById("mv-cancel-btn").addEventListener("click", removeModal);
    overlay.querySelector(".mv-close").addEventListener("click", removeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) removeModal();
    });
  }

  function renderLoadingStep() {
    const panel = document.getElementById(MODAL_ID);
    if (!panel) return;
    panel.innerHTML = `
      <button class="mv-close" type="button" aria-label="Close">&times;</button>
      <h2>Member Verification</h2>
      <p class="mv-loading">Checking your Member ID&hellip;</p>
    `;
    panel.querySelector(".mv-close").addEventListener("click", removeModal);
  }

  function renderNotFoundStep(bookingChoice) {
    const panel = document.getElementById(MODAL_ID);
    if (!panel) return;
    panel.innerHTML = `
      <button class="mv-close" type="button" aria-label="Close">&times;</button>
      <h2>Member Verification</h2>
      <p class="mv-instructions">
        Please enter your initials and first 3 numbers of your TTE number.
        Example ID: AB321
      </p>
      <input type="text" id="mv-member-id-input" placeholder="e.g. AB321" maxlength="10" autocomplete="off" />
      <div class="mv-error" id="mv-error-text">ID not found. Please check your Member ID and try again.</div>
      <div class="mv-buttons">
        <button type="button" class="mv-primary" id="mv-submit-btn">Verify</button>
        <button type="button" class="mv-secondary" id="mv-cancel-btn">Cancel</button>
      </div>
    `;
    panel.querySelector(".mv-close").addEventListener("click", removeModal);

    const input = document.getElementById("mv-member-id-input");
    const errorText = document.getElementById("mv-error-text");
    input.focus();

    function submit() {
      const memberId = input.value.trim().toUpperCase();
      if (!memberId) {
        errorText.textContent = "Please enter your Member ID.";
        return;
      }
      errorText.textContent = "";
      verifyMember(memberId, bookingChoice);
    }

    document.getElementById("mv-submit-btn").addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    document.getElementById("mv-cancel-btn").addEventListener("click", removeModal);
  }

  function renderConfirmationStep(member, bookingChoice) {
    const panel = document.getElementById(MODAL_ID);
    if (!panel) return;

    const fullName = `${member.player_first_name} ${member.player_last_name}`;

    panel.innerHTML = `
      <button class="mv-close" type="button" aria-label="Close">&times;</button>
      <h2>Confirm Your Details</h2>
      <p class="mv-confirmation">
        You are booking for <strong>${escapeHtml(fullName)}</strong>
        (TTE Number: <strong>${escapeHtml(String(member.tte_number))}</strong>).
      </p>
      <div class="mv-buttons">
        <button type="button" class="mv-primary" id="mv-continue-btn">Continue</button>
        <button type="button" class="mv-secondary" id="mv-goback-btn">Go Back</button>
      </div>
    `;
    panel.querySelector(".mv-close").addEventListener("click", removeModal);

    document.getElementById("mv-continue-btn").addEventListener("click", () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, member.memberId);
      sessionStorage.setItem(SESSION_STORAGE_NAME_KEY, fullName);
      sessionStorage.setItem(SESSION_STORAGE_TTE_KEY, String(member.tte_number));
      sessionStorage.setItem(SESSION_STORAGE_CHOICE_KEY, bookingChoice);
      removeModal();
      proceedToBookingFlow(bookingChoice, member);
    });

    document.getElementById("mv-goback-btn").addEventListener("click", () => {
      renderEntryStep(bookingChoice);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ======================================================================
  // Appwrite lookup
  // ======================================================================
  async function verifyMember(memberId, bookingChoice) {
    renderLoadingStep();

    const databases = getAppwrite();
    if (!databases) {
      const panel = document.getElementById(MODAL_ID);
      if (panel) {
        panel.innerHTML = `
          <button class="mv-close" type="button" aria-label="Close">&times;</button>
          <h2>Member Verification</h2>
          <div class="mv-error">
            Verification service is unavailable right now. Please try again later.
          </div>
        `;
        panel.querySelector(".mv-close").addEventListener("click", removeModal);
      }
      return;
    }

    try {
      const { Query } = window.Appwrite;
      const result = await databases.listDocuments(
        CONFIG.databaseId,
        CONFIG.collectionId,
        [Query.equal(CONFIG.memberIdField, memberId)]
      );

      if (result.total === 0 || !result.documents || result.documents.length === 0) {
        renderNotFoundStep(bookingChoice);
        return;
      }

      const doc = result.documents[0];
      renderConfirmationStep(
        {
          memberId,
          player_first_name: doc.player_first_name,
          player_last_name: doc.player_last_name,
          tte_number: doc.tte_number,
        },
        bookingChoice
      );
    } catch (err) {
      console.error("[member-verification] Appwrite query failed:", err);
      const panel = document.getElementById(MODAL_ID);
      if (panel) {
        panel.innerHTML = `
          <button class="mv-close" type="button" aria-label="Close">&times;</button>
          <h2>Member Verification</h2>
          <div class="mv-error">
            Something went wrong while checking your Member ID. Please try again.
          </div>
          <div class="mv-buttons">
            <button type="button" class="mv-primary" id="mv-retry-btn">Try Again</button>
          </div>
        `;
        panel.querySelector(".mv-close").addEventListener("click", removeModal);
        document
          .getElementById("mv-retry-btn")
          .addEventListener("click", () => renderEntryStep(bookingChoice));
      }
    }
  }

  // ======================================================================
  // Return to booking flow after successful verification
  // ======================================================================
  function proceedToBookingFlow(bookingChoice, member) {
    // Fire a custom event so beginner.html (or any listener) can react
    // without this file needing to know booking-flow internals.
    document.dispatchEvent(
      new CustomEvent("memberVerified", {
        detail: {
          bookingChoice,
          memberId: member.memberId,
          fullName: `${member.player_first_name} ${member.player_last_name}`,
          tteNumber: member.tte_number,
        },
      })
    );

    // Default behavior per choice — adjust targets/anchors to match your
    // actual booking flow markup/pages.
    switch (bookingChoice) {
      case "2-3-sessions":
        document.getElementById("booking-2-3-sessions-panel")?.scrollIntoView({ behavior: "smooth" });
        break;
      case "1-session":
        document.getElementById("booking-1-session-panel")?.scrollIntoView({ behavior: "smooth" });
        break;
      case "calendar":
        document.getElementById("booking-calendar-panel")?.scrollIntoView({ behavior: "smooth" });
        break;
    }
  }

  // ======================================================================
  // Wire up the three trigger buttons
  // ======================================================================
  function findButton(config) {
    let btn = document.querySelector(config.selector);
    if (btn) return btn;

    // Fallback: match by visible text content
    const candidates = document.querySelectorAll("button, a");
    for (const el of candidates) {
      if (el.textContent.trim() === config.fallbackText) {
        return el;
      }
    }
    return null;
  }

  function init() {
    BUTTON_SELECTORS.forEach((config) => {
      const btn = findButton(config);
      if (!btn) {
        console.warn(
          `[member-verification] Could not find button for "${config.fallbackText}". ` +
          `Add data-booking-choice="${config.choice}" to that button in beginner.html.`
        );
        return;
      }
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        renderEntryStep(config.choice);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose for manual triggering/testing if needed
  window.MemberVerification = {
    open: renderEntryStep,
    close: removeModal,
    getStoredMember: () => ({
      memberId: sessionStorage.getItem(SESSION_STORAGE_KEY),
      fullName: sessionStorage.getItem(SESSION_STORAGE_NAME_KEY),
      tteNumber: sessionStorage.getItem(SESSION_STORAGE_TTE_KEY),
      bookingChoice: sessionStorage.getItem(SESSION_STORAGE_CHOICE_KEY),
    }),
  };
})();
