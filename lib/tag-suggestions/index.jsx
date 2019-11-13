import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import appState from '../flux/app-state';
import TagIcon from '../icons/tag';
import { tracks } from '../analytics';

const { search } = appState.actionCreators;
const { recordEvent } = tracks;

export class TagSuggestions extends Component {
  static displayName = 'TagSuggestions';

  static propTypes = {
    query: PropTypes.string.isRequired,
    filteredTags: PropTypes.array.isRequired,
  };

  render() {
    const { filteredTags } = this.props;

    return (
      <Fragment>
        {filteredTags.length > 0 && (
          <div className="tag-suggestions">
            <div className="note-list-header">Tags</div>
            <ul className="tag-suggestions-list">
              {filteredTags.map(tag => (
                <li
                  key={tag.id}
                  id={tag.id}
                  className="tag-suggestion-row"
                  onClick={() => this.props.onSearch(`tag:${tag.id}`)}
                >
                  <TagIcon />
                  <span
                    className="tag-suggestion"
                    title={decodeURIComponent(tag.id)}
                  >
                    tag:{decodeURIComponent(tag.id)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Fragment>
    );
  }
}

const mapStateToProps = ({ appState: state }, ownProps) => ({
  // todo split on spaces to support additive query args
  filteredTags: state.tags.filter(function(tag) {
    // prefix tag ID with "tag:"; this allows us to match if the user typed the prefix
    var testID = 'tag:' + tag.id;
    return (
      testID.search(
        new RegExp('(tag:)?' + encodeURIComponent(ownProps.query), 'i')
      ) !== -1
    );
  }),
});

const mapDispatchToProps = dispatch => ({
  onSearch: filter => {
    dispatch(search({ filter }));
    recordEvent('list_notes_searched');
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TagSuggestions);
