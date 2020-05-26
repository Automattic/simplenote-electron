export const validatePassword = function (password: string, email: string) {
  // does not equal username (i.e. email address)
  if (password === email) {
    return false;
  }

  // minimum of 8 characters; no tabs or newlines
  // (letters, numbers, special characters and spaces allowed)
  const re = /^[^\r\n\t]{8,}$/;
  return re.test(password);
};
