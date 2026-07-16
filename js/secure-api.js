/**
 * secure-api.js
 * -----------------------------------------------------------------------
 * Appwrite-backed replacement for the old Netlify secure-api.js.
 *
 * Exposes the same two functions main.js and booking-summary.html already
 * call, so NOTHING else needs to change:
 *   - window.getSecurePricing(skillLevel, plan, discountCode)
 *   - window.createSecureBooking(bookingData)
 *
 * getSecurePricing() reads the price straight from Appwrite (a database
 * read isn't sensitive — anyone can see your prices on the page anyway).
 *
 * createSecureBooking() does NOT create the Stripe session itself. It
 * calls an Appwrite Function (server-side) which re-verifies the price
 * and creates the real Stripe Checkout Session using your secret key.
 * That key must never appear in this file or any browser-side code.
 *
 * REQUIRES: Appwrite Web SDK, loaded before this file, e.g.
 *   <script src="https://cdn.jsdelivr.net/npm/appwrite@15.0.0"></script>
 *   <script src="js/secure-api.js"></script>
 *
 * SETUP: fill in the CONFIG block below.
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

    // TODO: replace with your real "prices" collection ID.
    pricesCollectionId: "prices",

    // Field names inside each document in the prices collection.
    // Expected rows (matching what beginner/intermediate/advanced.html
    // and main.js's getSkillLevelFromPage() already use):
    //   skillLevel: "1-Under 11" | "2-Open" | "3-Squad"
    //   plan:       "3 sessions per week" | "1 session per week" | "Single sessions"
    //   price:      number
    skillLevelField: "skillLevel",
    planField: "plan",
    priceField: "price",

    // TODO: replace with your real Appwrite Function ID for checkout
    // session creation (see the accompanying Appwrite Function code).
    checkoutFunctionId: "create-checkout-session",
  };

  const DISCOUNT_CODE = "SIB";
  const DISCOUNT_RATE = 0.5; // 50% off, matches the old sibling discount

  let appwriteClient = null;
  let appwriteDatabases = null;
  let appwriteFunctions = null;

  function getAppwrite() {
    if (appwriteClient) {
      return { databases: appwriteDatabases, functions: appwriteFunctions };
    }

    if (!window.Appwrite) {
      console.error(
        "[secure-api] Appwrite SDK not found. Load it before secure-api.js."
      );
      return null;
    }

    const { Client, Databases, Functions } = window.Appwrite;
    appwriteClient = new Client()
      .setEndpoint(CONFIG.endpoint)
      .setProject(CONFIG.projectId);
    appwriteDatabases = new Databases(appwriteClient);
    appwriteFunctions = new Functions(appwriteClient);

    return { databases: appwriteDatabases, functions: appwriteFunctions };
  }

  /**
   * Get pricing for a skill level + plan combination, straight from
   * Appwrite. Applies the sibling discount client-side for DISPLAY only —
   * the Appwrite Function re-applies it authoritatively before charging.
   *
   * @param {string} skillLevel
   * @param {string} plan
   * @param {string} discountCode
   * @returns {Promise<{originalPrice: string, discountAmount: string, finalPrice: string}>}
   */
  async function getSecurePricing(skillLevel, plan, discountCode = "") {
    const appwrite = getAppwrite();
    if (!appwrite) {
      throw new Error("Pricing service is unavailable right now.");
    }

    const { Query } = window.Appwrite;

    const result = await appwrite.databases.listDocuments(
      CONFIG.databaseId,
      CONFIG.pricesCollectionId,
      [
        Query.equal(CONFIG.skillLevelField, skillLevel),
        Query.equal(CONFIG.planField, plan),
      ]
    );

    if (result.total === 0 || !result.documents.length) {
      throw new Error(`No price found for "${skillLevel}" / "${plan}".`);
    }

    const basePrice = parseFloat(result.documents[0][CONFIG.priceField]);

    let discountAmount = 0;
    if (discountCode && discountCode.toUpperCase() === DISCOUNT_CODE) {
      discountAmount = basePrice * DISCOUNT_RATE;
    }
    const finalPrice = basePrice - discountAmount;

    return {
      originalPrice: basePrice.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      finalPrice: finalPrice.toFixed(2),
    };
  }

  /**
   * Create a Stripe Checkout Session via an Appwrite Function. The price
   * is re-verified server-side inside that function — this call only
   * ever sends identifiers (skill level, plan, dates, names), never a
   * price, so nothing here can be tampered with to change what's charged.
   *
   * @param {Object} bookingData - merged bookingData + userDetails + discountCode
   * @returns {Promise<{id: string}>} Stripe Checkout Session info
   */
  async function createSecureBooking(bookingData) {
    const appwrite = getAppwrite();
    if (!appwrite) {
      throw new Error("Booking service is unavailable right now.");
    }

    // Attach the verified member details captured earlier on
    // junior-coaching.html, if present, so the coach's booking record
    // can be tied back to a verified club member.
    const payload = {
      ...bookingData,
      memberId: sessionStorage.getItem("bbb_member_id") || "",
      memberName: sessionStorage.getItem("bbb_member_name") || "",
      tteNumber: sessionStorage.getItem("bbb_member_tte") || "",
    };

    let execution;
    try {
      execution = await appwrite.functions.createExecution(
        CONFIG.checkoutFunctionId,
        JSON.stringify(payload)
      );
    } catch (err) {
      console.error("[secure-api] Appwrite Function call failed:", err);
      throw new Error("Could not start checkout. Please try again.");
    }

    // NOTE: parameter order for createExecution has changed across
    // Appwrite Web SDK versions. If this call errors, check the
    // signature for your installed appwrite package version.
    if (execution.responseStatusCode && execution.responseStatusCode >= 400) {
      console.error("[secure-api] Checkout function error response:", execution.responseBody);
      throw new Error("Could not create checkout session.");
    }

    let data;
    try {
      data = JSON.parse(execution.responseBody);
    } catch (err) {
      throw new Error("Unexpected response from checkout service.");
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data; // { id: "<stripe checkout session id>" }
  }

  // Export functions for use in other scripts — same names as before,
  // so main.js and booking-summary.html need zero changes.
  window.getSecurePricing = getSecurePricing;
  window.createSecureBooking = createSecureBooking;
})();
