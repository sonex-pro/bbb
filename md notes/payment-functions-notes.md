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