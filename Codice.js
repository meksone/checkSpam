/**
 * Check spam from linked account and notify master account if there's something to check in Spam Folder :)
 * 
 */

function checkSpamFolder() {
  let mustGo = '';
  // Get the threads in the spam folder
  var threads = GmailApp.search('in:spam');

  // Prepare an email body
  var emailBody = '';

  // Check if there are any threads in the spam folder
  if (threads.length > 0) {
    emailBody = 'Spam messages:\n\n';

    // Iterate over each thread
    for (var i = 0; i < threads.length; i++) {
      // Get the messages in this thread
      var messages = threads[i].getMessages();

      // Iterate over each message
      for (var j = 0; j < messages.length; j++) {
        // Extract the subject, date, and sender of the message
        var subject = messages[j].getSubject();
        var date = messages[j].getDate();
        var sender = messages[j].getFrom();

        // Add the subject, date, and sender to the email body
        emailBody += 'Subject: ' + subject + '\n';
        emailBody += 'Date: ' + date + '\n';
        emailBody += 'Sender: ' + sender + '\n\n';
      }
    }
    mustGo = 'go';
  } else {
    emailBody = 'No message in spam';
  }

  // Get the email address of the account owner
  var emailAddress = Session.getActiveUser().getEmail();

  // Send an email to the account owner
  if (mustGo == 'go'){
  GmailApp.sendEmail(emailAddress, 'Spam Report', emailBody);
  };
}
  