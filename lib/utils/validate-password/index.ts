export const validatePassword = function (password: string, email: string) {
  // does not contain username (i.e. email address)
  if (email !== '' && password.includes(email)) {
    return false;
  }
  // minimum of 8 characters, max of 64
  // allow symbols ~!@#$%^&*_-+=`|(){}[]:;"',.?/
  const re = /^[a-zA-Z0-9~ !@#$%^&*_\-+=`|()[\]:;"',.?/]{8,64}$/;
  return re.test(password);
};
