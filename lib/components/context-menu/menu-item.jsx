export default MenuItem = () => null;

MenuItem.propTypes = {
  label: PropTypes.string,
  role: PropTypes.string,
  type: PropTypes.oneOf([
    'normal',
    'separator',
    'submenu',
    'checkbox',
    'radio',
  ]),
};
