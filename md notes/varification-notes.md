## Member Verification Flow

When a user clicks any of the three buttons in `beginner.html`:

* **Choose 2/3 sessions per week**
* **Choose 1 session per week**
* **Show calendar to book**

run a JavaScript member verification process.

### Step 1 - Open Verification

Display a modal (or navigate to a new page) that asks the user to enter their **Member ID**.

### Step 2 - Fetch Member Details

When the user submits the Member ID, use JavaScript to query the Appwrite database.

**Database**

* Database: `Batts Booking`
* Collection: `Members`

Search for a document where:

* `id_from_bbb` = the Member ID entered by the user.

Retrieve the following fields:

* `player_first_name`
* `player_last_name`
* `tte_number`

### Step 3 - If Member Is Found

If a matching member is found:

1. Combine the first and last name into the player's full name.
2. Display a confirmation message:

> You are booking for **{player_first_name} {player_last_name}** (TTE Number: **{tte_number}**).

3. Show two buttons:

   * **Continue**
   * **Go Back**

If the user selects **Continue**, save the entered Member ID in `sessionStorage` for use during the booking process.

### Step 4 - If Member Is Not Found

If no matching document exists in Appwrite, display the message:

> **ID not found. Please check your Member ID and try again.**

Do not allow the user to continue until a valid Member ID is entered.

### JavaScript File

Create a new file named:

`member-verification.js`

This file should contain all logic for:
* instructions for the user: Please enter your initials and first 3 numbers of your TTE number. Example ID: AB321
* Opening the verification modal/page.
* Fetching member data from Appwrite.
* Handling success and error responses.
* Displaying the confirmation message.
* Saving the Member ID to `sessionStorage`.
* Returning the user to the booking flow after successful verification.
