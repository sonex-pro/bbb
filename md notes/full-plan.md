We can build it one step at a time, and I won't skip ahead. We'll make sure each step works before moving on.

What we'll build

Eventually your Appwrite project will look something like this:

Batts Booking

Authentication
    Admin
    Coach

Database collections/tables

1. Members
2. Prices
3. Sessions
4. Payments

Storage
(optional later)

Functions
(optional later)

We'll ignore Functions and Storage for now.

Step 1 - Create an Appwrite account

Go to Appwrite Cloud and create a free account.

After signing in:

Click

Create Project

Project name:

Batts Booking

Choose any region that's closest to you (London or Europe if available).

That's it.

Don't worry about API keys or anything else yet.

Step 2 - Create your database

On the left menu you'll see something like

Overview

Databases

Storage

Functions

Auth

Click

Databases

Then

Create Database

Name it

Batts Database

Leave everything else as default.

Step 3 - Create your first collection

Think of Collections as tables.

The first one we'll make is Prices because it's the simplest.

Click

Create Collection

Name

Prices
Step 4 - Add attributes

Instead of SQL columns, Appwrite calls them Attributes.

We'll create three.

Attribute 1
Name

key

Type

String

Required

✅ Yes

Attribute 2
price

Type

Float

Required

✅ Yes

Attribute 3
description

Type

String

Required

No

Your collection now looks like

key	price	description
Step 5 - Add documents

Now click

Create Document

The first one

key

under11_single
price

8
description

Under 11 single session

Save.

Create another

key

under11_monthly_1
price

30

Another

key

under11_monthly_3
price

45

Eventually you'll have something like

key	price in UK pounds
under11_single	8
under11_monthly_1	30
under11_monthly_3	45
junior_single	10
junior_monthly_1	38
junior_monthly_3	52
squad_single	13
squad_monthly_1	44
squad_monthly_3	68

Now all your prices live in one place.

Later your website will simply ask Appwrite
Give me

under11_single

Appwrite replies

8

Your page displays

£8

If next year you increase it to £9...

You open Appwrite.

Change

8

to

9

Press Save.

Done.

No GitHub.

No Netlify deployment.

No editing JavaScript.

My suggestion for the order we build things

Rather than trying to build everything at once, I'd recommend this sequence:

✅ Create the Appwrite project.
✅ Create the Prices collection and make your website read prices from it.
Create the Members collection.
Add admin login.
Build the admin page to add/edit members.
Connect Stripe so it charges the price stored in Appwrite.
Create the Payments collection.
Build the coach dashboard to show who has paid.

This way, you'll always have a working system, and each new feature builds on the last.

I think this is a much less overwhelming approach than trying to design all four collections before you've even connected your website to Appwrite. When you're ready, we can start with Step 1 and I'll wait after each step for you to confirm it's working before we continue.