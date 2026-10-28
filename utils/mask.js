// Email: ********@gmail.com
const EMAIL_REGEX = /([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/gi;

// Phone: 10+ digits, optional +, spaces, dashes, brackets
const PHONE_REGEX = /\+?\d[\d\s\-()]{8,}\d/g;

function maskEmail(text) {
  return text.replace(EMAIL_REGEX, (_, local, domain) => '*'.repeat(local.length) + '@' + domain);
}

function maskPhone(text) {
  return text.replace(PHONE_REGEX, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length < 10) return match;
    return digits.slice(0, 2) + '*'.repeat(digits.length - 4) + digits.slice(-2);
  });
}

// Email first, so digits inside an email aren't treated as a phone number
function maskContent(text) {
  return maskPhone(maskEmail(text));
}

module.exports = { maskContent };