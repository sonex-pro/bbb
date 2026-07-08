# Table Tennis Session Booking & Payment System — Project Idea

## Overview

A web-based system for managing table tennis players, session pricing, bookings, and payments.

**Constraints:**

* No local storage/database on the user device.
* Maximum expected members: approximately 100.
* Use cloud services such as:

  * Appwrite (database, authentication, backend services)
  * Netlify (hosting/deployment)
  * GitHub (source control)
  * Stripe (payments)
* Do not use Google Sheets.

---

## User Roles

### Admin

Admin has full control of the system.

Admin can:

* Create player/member accounts.

* Add and edit player details:

  * Player name
  * Payer name
  * Email address
  * Phone number
  * Table Tennis England (TTE) membership number
  * Payment reference

* Create and manage session prices:

  * Under 11
  * Junior
  * Squad

* Edit prices at any time.

**Important:**

* Public users cannot change prices.

---

### Coach

Coach logs into the system.

Coach can:

* View upcoming sessions.
* See which players have paid.
* View:

  * Player first name
  * Player last name
  * Session type
  * Session date
  * Payment status
  * TTE number

---

### Player / Payer

The payer visits the public website.

Process:

1. Selects:

   * Session type
   * Date of session

2. Clicks **Pay**.

3. JavaScript asks for:

   * Player first name
   * TTE membership number

4. System confirms:

Example:

> You are paying for Dave Smith — Under 11s session — 15th June 2026.
> Continue or go back.

5. Payer confirms and clicks **Continue**.

6. Payment is processed through Stripe.

7. After successful payment:

   * Payment record is saved.
   * Player details are saved/linked.
   * Coach can view the booking.

---

## Suggested Database Structure

### Members Table

| Field             | Description               |
| ----------------- | ------------------------- |
| id                | Unique ID                 |
| player_first_name | Player first name         |
| player_last_name  | Player last name          |
| payer_name        | Parent/payer name         |
| email             | Contact email             |
| phone             | Contact phone             |
| tte_number        | TTE membership number     |
| category          | Junior / Adult            |
| payment_reference | Payment reference         |



### Payments Table

| Field             | Description      |
| ----------------- | ---------------- |
| id                | Payment ID       |
| member_id         | Player           |
| session_id        | Session          |
| stripe_payment_id | Stripe reference |
| amount            | Paid amount      |
| status            | Paid / Failed    |
| date_paid         | Payment date     |

---

## Possible System Flow

Admin:

```
Create Player
        ↓
Create Session Prices
        ↓
Publish Website
```

Payer:

```
Choose Session
        ↓
Enter Player Details
        ↓
Confirm Booking
        ↓
Stripe Payment
        ↓
Database Updated
        ↓
Coach Sees Paid List
```

---

## Recommended Technology Stack

Frontend:

* HTML / CSS / JavaScript
* Hosted on Netlify

Backend:

* Appwrite Authentication
* Appwrite Database
* Appwrite Functions (optional)

Payments:

* Stripe Checkout

Development:

* GitHub repository

This should comfortably handle around 100 members without needing a complex system.
