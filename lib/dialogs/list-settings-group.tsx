import React, { FunctionComponent, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import PanelTitle from '../components/panel-title';

type ItemsType = string[];

type Props = {
  description?: string;
  items: ItemsType;
  onChange: Function;
  pattern?: string;
  placeholder?: string;
  title: string;
};

const ListSettingsGroup: FunctionComponent<Props> = ({
  description,
  items,
  onChange,
  pattern,
  placeholder,
  title,
}) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    console.log(`Items = ${items.join(',')}`);
  }, [items]);

  const onTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  };

  const onDone = () => {
    const newItems = items.concat(value).sort();
    onChange(newItems);
    setValue('');
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      onDone();
    }
  };

  return (
    <div className="settings-group">
      <PanelTitle headingLevel={3}>{title}</PanelTitle>
      {description && <p>{description}</p>}
      <div className="settings-items theme-color-border">
        {items.map((item: string, i: number) => (
          <div
            className="settings-item theme-color-border"
            key={`${item}-${i}`}
          >
            <div className="settings-item-label">{item}</div>
          </div>
        ))}
        <div className="settings-item theme-color-border">
          <input
            className="settings-item-text-input transparent-input"
            title="Enter a new item"
            onBlur={onDone}
            onChange={onTextChange}
            onKeyDown={onKeyDown}
            pattern={pattern}
            placeholder={placeholder}
            spellCheck={false}
            value={value}
          />
        </div>
      </div>
    </div>
  );
};

ListSettingsGroup.propTypes = {
  description: PropTypes.string,
  items: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  pattern: PropTypes.string,
  placeholder: PropTypes.string,
  title: PropTypes.string.isRequired,
};

export default ListSettingsGroup;
