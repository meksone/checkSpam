# Check Spam 0.1.1

## Description

```Check Spam``` is a simple script to check the presence of email in the Spam folder of a Gmail account;
if some spam is found, it creates a simple summary (subject, sender, date ) and send an mail to himself.

This is useful when the account is checked from another account (a shadow account), to avoid any potential problem caused by incorrectly classified spam messages.

Each spam message is reported immediately, then after 2 hours, after 3 hours, and every 4 hours thereafter. The script keeps this state in `Script Properties`.

To delete a message from the original Spam folder, reply to its report with `DELETE SPAM <Message ID>`, replacing `<Message ID>` with the ID shown in the report.

## How to use
Enable GMail API Advanced services, then execute the script for the first time to confirm permissions.
Then, from script triggers, run `checkSpamFolder` hourly. The trigger frequency is the resolution of the schedule: the script itself decides whether each message is due for a new report.
