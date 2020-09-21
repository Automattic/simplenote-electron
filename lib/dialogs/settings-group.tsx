import React from 'react';
import PropTypes from 'prop-types';
import PanelTitle from '../components/panel-title';
import { viewExternalUrl } from '../utils/url-utils';

export const Item = () => null;

export const SettingsGroup = ({
  title: groupTitle,
  slug: groupSlug,
  activeSlug,
  description,
  onChange,
  learnMoreURL,
  renderer,
  children,
}) => {
  const learnMoreLink = (
    <a
      href={learnMoreURL}
      onClick={(event) => {
        event.preventDefault();
        viewExternalUrl(learnMoreURL);
      }}
    >
      Learn more
    </a>
  );

  const childElements = React.Children.toArray(children).filter((o) => o);

  return (
    <div className="settings-group">
      <PanelTitle headingLevel={3}>{groupTitle}</PanelTitle>
      <div className="settings-items theme-color-border">
        {childElements.map(({ props: { slug, title } }) => (
          <label
            className="settings-item theme-color-border"
            htmlFor={`settings-field-${groupSlug}-${slug}`}
            key={slug}
          >
            <div className="settings-item-label">{title}</div>
            <div className="settings-item-control">
              {renderer({
                activeSlug,
                groupTitle,
                groupSlug,
                slug,
                title,
                isEnabled: slug === activeSlug,
                onChange,
              })}
            </div>
          </label>
        ))}
      </div>
      {description && (
        <p>
          {description} {learnMoreURL && learnMoreLink}
        </p>
      )}
    </div>
  );
};

SettingsGroup.propTypes = {
  activeSlug: PropTypes.string,
  children: PropTypes.node,
  description: PropTypes.string,
  learnMoreURL: PropTypes.string,
  onChange: PropTypes.func,
  renderer: PropTypes.func,
  slug: PropTypes.string,
  title: PropTypes.string,
};

export default SettingsGroup;
