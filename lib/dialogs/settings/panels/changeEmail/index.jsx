import isemail from 'isemail';
import React, { Fragment, useState } from 'react';

const ChangeEmail = () => {
  const [values, setValues] = useState({
    email: '',
    confirmEmail: '',
    password: '',
  });

  const handleInputChange = e => {
    const { name, value } = e.target;
    setValues({ ...values, [name]: value });
  };

  const validateForm = formValues => {
    const errors = [];
    if (!isemail.validate(formValues.email)) {
      errors.push('The email entered is invalid');
    }
    if (formValues.email !== formValues.confirmEmail) {
      errors.push('The emails do not match');
    }
    if (3 < formValues.password.lenth) {
      errors.push('Please eneter a valid password');
    }
    return errors;
  };

  const saveNewEmail = () => {
    const errors = validateForm(values);
    if (errors.length) {
      // setErrors();
      return;
    }
    const url =
      'https://app.simplenote.com/emailchange?csrf_token=' + window.csrf_token;
    fetch(url, {
      body: JSON.stringify({
        newemail: values.email,
        password: values.password,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      method: 'post',
    })
      .then(function(data) {
        console.log('Request succeeded with JSON response', data);
      })
      .catch(function(error) {
        console.log('Request failed', error);
      });
  };

  return (
    <Fragment>
      <span>Change Email</span>
      <label>New Email Address</label>
      <input
        onChange={handleInputChange}
        name="email"
        placeholder="Email"
        type="text"
        value={values.email}
      />
      <label>Confirm Email Address</label>
      <input
        onChange={handleInputChange}
        name="confirmEmail"
        placeholder="Confirm Email"
        type="text"
        value={values.confirmEmail}
      />
      <label>Password</label>
      <input
        onChange={handleInputChange}
        name="password"
        placeholder="Password"
        type="password"
        value={values.password}
      />
      <button aria-label="Save New Email" onClick={saveNewEmail}>
        Save
      </button>
    </Fragment>
  );
};

ChangeEmail.propTypes = {};

export default ChangeEmail;
