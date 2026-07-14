/**
 * member-verification.js
 * -----------------------------------------------------------------------
 * Member verification flow for junior-coaching.html
 *
 * Attach this script to junior-coaching.html (after the Appwrite Web SDK)
 * and it will intercept clicks on the "Book Now" buttons inside each
 * .fee-card, ask the user for their Member ID, look it up in Appwrite,
 * and — once confirmed — send them on to that card's booking page.
 *
 * REQUIRES: Appwrite Web SDK, loaded before this file, e.g.
 *   <script src="https://cdn.jsdelivr.net/npm/appwrite@15.0.0"></script>
 *   <script src="js/member-verification.js"></script>
 *
 * SETUP: fill in the CONFIG block below with your project's real values.
 *
 * HOW BUTTON TARGETING WORKS
 * -----------------------------------------------------------------------
 * This file does not hardcode any destination page names. Instead, for
 * every button matching BUTTON_SELECTOR it reads:
 *   - the tier name from the nearest ancestor .fee-card's <h3>
 *   - the destination page from the button's own href attribute
 * So it automatically supports any number of "Book Now" buttons/cards —
 * add or rename cards freely and this script adapts without edits.
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

  // Selector for the "Book Now" buttons inside each coaching card on
  // junior-coaching.html. Tier name + destination are derived per-button
  // at runtime (see header comment above) — nothing to configure here.
  const BUTTON_SELECTOR = ".fee-card .btn.btn-primary";

  const SESSION_STORAGE_KEY = "bbb_member_id";
  const SESSION_STORAGE_NAME_KEY = "bbb_member_name";
  const SESSION_STORAGE_TTE_KEY = "bbb_member_tte";
  const SESSION_STORAGE_TIER_KEY = "bbb_booking_tier";

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
   * @param {{tierName: string, target: string}} booking
   */
  function renderEntryStep(booking) {
    removeModal();
    injectStyles();

    const overlay = document.createElement("div");
    overlay.id = MODAL_ID + "-overlay";
    overlay.innerHTML = `
      <div class="mv-panel" id="${MODAL_ID}" role="dialog" aria-modal="true" aria-labelledby="mv-title">
        <button class="mv-close" type="button" aria-label="Close">&times;</button>
        <h2 id="mv-title">Member Verification</h2>
        <p class="mv-instructions">
          Booking: <strong>${escapeHtml(booking.tierName)}</strong><br>
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
      verifyMember(memberId, booking);
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

  function renderNotFoundStep(booking) {
    const panel = document.getElementById(MODAL_ID);
    if (!panel) return;
    panel.innerHTML = `
      <button class="mv-close" type="button" aria-label="Close">&times;</button>
      <h2>Member Verification</h2>
      <p class="mv-instructions">
        Booking: <strong>${escapeHtml(booking.tierName)}</strong><br>
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
      verifyMember(memberId, booking);
    }

    document.getElementById("mv-submit-btn").addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    document.getElementById("mv-cancel-btn").addEventListener("click", removeModal);
  }

  function renderConfirmationStep(member, booking) {
    const panel = document.getElementById(MODAL_ID);
    if (!panel) return;

    const fullName = `${member.player_first_name} ${member.player_last_name}`;

    panel.innerHTML = `
      <button class="mv-close" type="button" aria-label="Close">&times;</button>
      <h2>Confirm Your Details</h2>
      <p class="mv-confirmation">
        You are booking <strong>${escapeHtml(booking.tierName)}</strong> for
        <strong>${escapeHtml(fullName)}</strong>
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
      sessionStorage.setItem(SESSION_STORAGE_TIER_KEY, booking.tierName);
      removeModal();
      proceedToBookingFlow(booking, member);
    });

    document.getElementById("mv-goback-btn").addEventListener("click", () => {
      renderEntryStep(booking);
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
  async function verifyMember(memberId, booking) {
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
        renderNotFoundStep(booking);
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
        booking
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
          .addEventListener("click", () => renderEntryStep(booking));
      }
    }
  }

  // ======================================================================
  // Return to booking flow after successful verification
  // ======================================================================
  function proceedToBookingFlow(booking, member) {
    // Fire a custom event so any listener on the page can react without
    // this file needing to know booking-flow internals.
    document.dispatchEvent(
      new CustomEvent("memberVerified", {
        detail: {
          tierName: booking.tierName,
          target: booking.target,
          memberId: member.memberId,
          fullName: `${member.player_first_name} ${member.player_last_name}`,
          tteNumber: member.tte_number,
        },
      })
    );

    // Send the visitor on to the tier-specific booking page the button
    // originally linked to.
    if (booking.target) {
      window.location.href = booking.target;
    }
  }

  // ======================================================================
  // Wire up every "Book Now" button on the page
  // ======================================================================
  function getTierName(button) {
    const card = button.closest(".fee-card");
    const heading = card ? card.querySelector("h3") : null;
    return heading ? heading.textContent.trim() : "Booking";
  }

  function init() {
    const buttons = document.querySelectorAll(BUTTON_SELECTOR);

    if (buttons.length === 0) {
      console.warn(
        `[member-verification] No buttons found matching "${BUTTON_SELECTOR}".`
      );
      return;
    }

    buttons.forEach((btn) => {
      const booking = {
        tierName: getTierName(btn),
        target: btn.getAttribute("href"),
      };

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        renderEntryStep(booking);
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
      tierName: sessionStorage.getItem(SESSION_STORAGE_TIER_KEY),
    }),
  };
})();
