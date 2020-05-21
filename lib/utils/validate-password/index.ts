export const validatePassword = function (password: string, email: string) {
  // does not equal username (i.e. email address)
  if (password === email) {
    return false;
  }
  // minimum of 8 characters
  // allow symbols ~!@#$%^&*_-+=`|(){}[]:;"',.?/
  const re = /^[a-zA-Z0-9~ !@#$%^&*_\-+=`|()[\]:;"',.?/]{8,}$/;
  return re.test(password);
};
