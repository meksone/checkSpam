const STATE_KEY = 'spamState';
const ALERT_INTERVALS_HOURS = [0, 2, 3, 4];

function checkSpamFolder() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    processDeletionRequests_();

    const properties = PropertiesService.getScriptProperties();
    const state = JSON.parse(properties.getProperty(STATE_KEY) || '{}');
    const now = Date.now();
    const messagesToNotify = [];
    const activeIds = {};

    GmailApp.search('in:spam').forEach(function(thread) {
      thread.getMessages().forEach(function(message) {
        const messageId = message.getId();
        activeIds[messageId] = true;

        const record = state[messageId] || { alertCount: 0, lastAlertAt: 0 };
        if (isAlertDue_(record, now)) {
          messagesToNotify.push({ message: message, record: record });
        }
        state[messageId] = record;
      });
    });

    Object.keys(state).forEach(function(messageId) {
      if (!activeIds[messageId]) {
        delete state[messageId];
      }
    });

    if (messagesToNotify.length > 0) {
      const emailBody = buildReport_(messagesToNotify);
      GmailApp.sendEmail(
        Session.getActiveUser().getEmail(),
        'Spam Report',
        emailBody
      );

      messagesToNotify.forEach(function(item) {
        item.record.alertCount += 1;
        item.record.lastAlertAt = now;
      });
    }

    saveState_(properties, state);
  } finally {
    lock.releaseLock();
  }
}

function saveState_(properties, state) {
  const MAX_BYTES = 8000; // ScriptProperties caps each value at 9KB.
  let json = JSON.stringify(state);

  if (json.length > MAX_BYTES) {
    // Drop the least-recently-alerted entries first; they'll just be
    // re-reported as new on a later run.
    const keys = Object.keys(state).sort(function(a, b) {
      return state[a].lastAlertAt - state[b].lastAlertAt;
    });
    for (let i = 0; i < keys.length && json.length > MAX_BYTES; i++) {
      delete state[keys[i]];
      json = JSON.stringify(state);
    }
  }

  properties.setProperty(STATE_KEY, json);
}

function isAlertDue_(record, now) {
  if (record.alertCount === 0) {
    return true;
  }

  const intervalIndex = Math.min(record.alertCount, ALERT_INTERVALS_HOURS.length - 1);
  const intervalMs = ALERT_INTERVALS_HOURS[intervalIndex] * 60 * 60 * 1000;
  return now - record.lastAlertAt >= intervalMs;
}

function buildReport_(messagesToNotify) {
  let emailBody = 'Spam messages:\n\n';

  messagesToNotify.forEach(function(item) {
    const message = item.message;
    emailBody += 'Subject: ' + message.getSubject() + '\n';
    emailBody += 'Date: ' + message.getDate() + '\n';
    emailBody += 'Sender: ' + message.getFrom() + '\n';
    emailBody += 'Message ID: ' + message.getId() + '\n\n';
  });

  emailBody += 'Per cancellare un messaggio, rispondi a questa email con:\n';
  emailBody += 'DELETE SPAM <Message ID>\n';
  return emailBody;
}

function processDeletionRequests_() {
  GmailApp.search('in:inbox "DELETE SPAM"').forEach(function(thread) {
    thread.getMessages().forEach(function(message) {
      // Skip the report itself (not a reply) - its footer text also
      // matches "DELETE SPAM <id>" but it's the instructions, not a command.
      if (message.getSubject() === 'Spam Report') {
        return;
      }

      const matches = message.getPlainBody().match(/DELETE\s+SPAM\s+([A-Za-z0-9_-]+)/gi) || [];
      if (matches.length === 0) {
        return;
      }

      matches.forEach(function(command) {
        const messageId = command.match(/([A-Za-z0-9_-]+)$/)[1];
        try {
          GmailApp.getMessageById(messageId).moveToTrash();
        } catch (error) {
        }
      });

      // Consume the command so it isn't processed again on the next run.
      message.moveToTrash();
    });
  });
}
  