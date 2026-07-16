My Stripe account is connected to Netlify then Netlify sends details to the google apps script google sheet.
I think functions are free in Appwite, what is the best flow for my new booking site,
I need to record the successful payment details for the table tennis coach to read.
You're right that Appwrite Functions have a generous free tier, and using them
lets you drop Netlify from the stack entirely — one platform instead of two. Here's the flow I'd recommend:
1. Checkout creation (client → Appwrite Function)
The booking page sends only identifiers — skillLevel, plan, bookingType, month/date, verified memberId, 
discount code — to an Appwrite Function (create-checkout-session, replacing your Netlify function of the same job). 
That function:

Looks up the authoritative price from your prices collection (never trusts a price from the browser).
Creates the Stripe Checkout Session server-side, with the booking details tucked into Stripe's metadata field
(player name, tier, plan, date, member ID, TTE number).
Returns the Checkout URL to the browser, which redirects there.

2. Payment confirmation (Stripe → Appwrite Function, via webhook)
This is the important part: don't rely on the browser landing back on a "success" page 
as your proof of payment — that can be spoofed or the tab can just close. Instead, 
add a Stripe webhook pointed at a second Appwrite Function, listening for checkout.session.completed. 
That function:

Verifies the webhook signature (Stripe's signing secret) so only real Stripe events get through.
Pulls the metadata back out.
Writes one document into a bookings (or payments) collection in Appwrite — using the Stripe session ID as 
the document ID, so a webhook retry can't create a duplicate.

This mirrors what Netlify → Apps Script → Sheet was doing, just with the webhook landing in Appwrite instead.
3. Coach reads the results
A few options, not mutually exclusive:

Zero build: the coach logs into the Appwrite Console directly and browses the bookings collection as a table. 
Fastest to have working, but it's a developer-facing UI, not the friendliest for a coach.
Simple dashboard: a small password-protected page on your site that queries bookings via the Appwrite 
client SDK and renders a proper table — closer to what a Google Sheet felt like.
Email notification: have the webhook function also fire an email (Appwrite has a Messaging service for this) to the 
coach on each successful booking, so they don't have to go look anything up.

Which of those fits how the coach actually wants to check bookings — logging into something, or getting notified?

Two things worth knowing before the code: getSecurePricing() can be a plain client-side
Appwrite database read (prices aren't secret). But createSecureBooking() must go through 
a server-side Appwrite Function, because creating the real Stripe Checkout Session needs 
your Stripe secret key — that can never live in browser JS. So secure-api.js calls an 
Appwrite Function; the Function itself talks to Stripe.
To get this working, you'll need to set up in Appwrite:

A prices collection in your database, with one document per skill-level + plan combination. Based on what beginner.html and the old fallback table use, you need rows like:
columns: skillLevel, plan, price
values: 1-Under 11, 3 sessions per week, 45
values: 1-Under 11, 1 session per week, 30
values: 1-Under 11, Single sessions, 8
values: 2-Open (confirm this string matches getSkillLevel FromPage()), 3 sessions per week, 52
...and so on for Squad
Give this collection read permission for "Any" — same public-read pattern as your member_verification collection.
Deploy the Appwrite Function (create-checkout-session) with:

Runtime: Node.js 18 or 20
Entrypoint: src/main.js
Environment variables: STRIPE_SECRET_KEY, SITE_URL, PRICES_DATABASE_ID, PRICES_COLLECTION_ID
Execute access: "Any" (bookers aren't logged-in Appwrite users)


In secure-api.js, fill in the two TODOs in CONFIG: your real pricesCollectionId and the Function's ID (checkoutFunctionId) — get that ID from the Appwrite Console after creating the Function.
Add <script src="js/secure-api.js"></script> back into booking-summary.html (after the Stripe.js and Appwrite SDK includes), and to any other page that calls getSecurePricing.

One flag: createExecution()'s exact signature has changed across Appwrite SDK versions — worth testing this end-to-end once deployed, since a version mismatch there is the most likely thing to need a small tweak.
Once this is live and taking real payments, that's the point to circle back to the Stripe webhook → coach's booking record piece we discussed earlier — want to build that next, or test this checkout flow first?