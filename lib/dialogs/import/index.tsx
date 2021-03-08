import React, { Component, Suspense } from 'react';
import { connect } from 'react-redux';

import Dialog from '../../dialog';
import { isElectron } from '../../utils/platform';
import SourceImporter from './source-importer';
import { closeDialog } from '../../state/ui/actions';

import * as S from '../../state';

type DispatchProps = {
  closeDialog: () => any;
};

type Props = DispatchProps;

class ImportDialog extends Component<Props> {
  state = {
    importStarted: false,
  };

  render() {
    const { closeDialog } = this.props;
    const { importStarted } = this.state;
    const source = {
      acceptedTypes: isElectron ? '.txt,.md,.json,.enex' : '.txt,.md,.json',
      title: `Select the notes you'd like to import.`,
      instructions: isElectron
        ? 'Accepted file formats: Simplenote (JSON), Text (TXT, MD) and Evernote (ENEX).'
        : 'Accepted file formats: Simplenote (JSON) and Text (TXT, MD).',
      multiple: true,
    };

    return (
      <Dialog
        className="import"
        closeBtnLabel={importStarted ? '' : 'Cancel'}
        onDone={importStarted ? undefined : closeDialog}
        title="Import Notes"
      >
        <div className="import__inner">
          <SourceImporter
            locked={importStarted}
            onClose={closeDialog}
            onStart={() => this.setState({ importStarted: true })}
            source={source}
          />
        </div>
      </Dialog>
    );
  }
}

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  closeDialog,
};

export default connect(null, mapDispatchToProps)(ImportDialog);
