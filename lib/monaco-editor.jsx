import React from 'react';
import { connect } from 'react-redux';
import MonacoEditor from 'react-monaco-editor';
import urlRegex from 'url-regex';

import { getLastPatch } from './state/notes';

const variableWidth =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen-Sans", "Ubuntu", "Cantarell", "Helvetica Neue", sans-serif';

export class Editor extends React.Component {
  state = {
    width: 800,
    height: 600,
  };

  componentDidMount() {
    window.addEventListener('resize', this.resize, false);
    this.resize();

    this.props.storeFocusEditor(() => this.editor && this.editor.focus());
    this.props.storeHasFocus(() => this.editor && this.editor.isFocused());
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resize, false);
  }

  componentDidUpdate({ content, markdownIsEnabled, theme }) {
    if (theme !== this.props.theme) {
      this.setTheme();
    }

    if (markdownIsEnabled !== this.props.markdownIsEnabled) {
      this.setLanguage();
    }

    if (content !== this.props.content) {
      const model = this.editor.getModel();
      const startOffset = model.getOffsetAt(this.editor.getPosition());
      const shift = (this.props.lastPatch || [])
        .reduce(
          (sum, [op, offset, data]) =>
            offset <= startOffset
              ? op === '+' ? sum + data.length : sum - data
              : sum,
          0
        );

      this.disableUpdates = true;
      model.applyEdits([
        {
          identifier: { major: 1, minor: 1 },
          range: model.getFullModelRange(),
          text: this.props.content,
          forceMoveMarkers: true,
        },
      ]);
      this.disableUpdates = false;

      // The immediate Promise resolution didn't work here
      // as it worked in `onChange` below - there are bigger
      // concerns and it's probably async rendering. this
      // probably just takes longer to update the editor
      if (shift) {
        setTimeout(() => {
          const model = this.editor.getModel();
          const start = model.getPositionAt(startOffset);
          const end = model.modifyPosition(start, shift);
          this.editor.setPosition(end);
        }, 50);
      }
    }
  }

  /*
   * https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.imodelcontentchangedevent.html
   * event: {
   *   changes: [
   *     {
   *       range: {
   *         endColumn
   *         endLineNumber
   *         startColumn
   *         startLineNumber
   *       }
   *       rangeLength
   *       text
   *     }
   *   ],
   *   eol: end of line character
   *   isFlush: has model reset?
   *   isRedoing
   *   isUndoing
   *   versionId
   * }
   */
  onChange = (value, event) => {
    if (!this.monaco || this.disableUpdates) {
      return;
    }

    const autolist = () => {
      // perform list auto-complete
      if (event.isRedoing || event.isUndoing) {
        return;
      }

      const change = event.changes.find(({ text }) =>
        new RegExp(`^${event.eol}\\s*$`).test(text)
      );

      if (!change) {
        return;
      }

      const lineNumber = change.range.startLineNumber;
      if (
        lineNumber === 0 ||
        // the newline change starts and ends on one line
        lineNumber !== change.range.endLineNumber
      ) {
        return;
      }

      const model = this.editor.getModel();
      const prevLine = model.getLineContent(lineNumber);

      const prevList = /^(\s+)([-+*])(\s+)/.exec(prevLine);
      if (null === prevList) {
        return;
      }

      const thisLine = model.getLineContent(lineNumber + 1);
      if (!/^\s*$/.test(thisLine)) {
        return;
      }

      const lineStart = model.getOffsetAt({
        column: 0,
        lineNumber: lineNumber + 1,
      });

      const nextStart = model.getOffsetAt({
        column: 0,
        lineNumber: lineNumber + 2,
      });

      const range = new this.monaco.Range(
        lineNumber + 1,
        0,
        lineNumber + 1,
        thisLine.length
      );
      const identifier = { major: 1, minor: 1 };
      const text = prevList[0];
      const op = { identifier, range, text, forceMoveMarkers: true };
      this.editor.executeEdits('autolist', [op]);

      // for some reason this wasn't updating
      // the cursor position when executed immediately
      // so we are running it on the next micro-task
      Promise.resolve().then(() =>
        this.editor.setPosition({
          column: prevList[0].length + 1,
          lineNumber: lineNumber + 1,
        })
      );

      return (
        value.slice(0, lineStart) +
        prevList[0] +
        event.eol +
        value.slice(nextStart)
      );
    };

    this.props.onChangeContent(autolist() || value);
  };

  resize = () => {
    if (!this.container) {
      return;
    }

    // throttle to every four frames
    // this is hand-tuned so feel free to make better
    const now = performance.now();
    if (this.lastResize && now - this.lastResize < 4 * 1000 / 60) {
      return;
    }

    this.lastResize = now;

    this.setState(
      {
        width: this.container.clientWidth,
        height: this.container.clientHeight,
      },
      () => this.editor && this.editor.layout()
    );
  };

  setLanguage = () => {
    if (!this.monaco) {
      return;
    }

    const { markdownIsEnabled } = this.props;
    const language = markdownIsEnabled ? 'markdown' : 'linkified';

    this.monaco.editor.setModelLanguage(this.editor.getModel(), language);
  };

  setTheme = () => {
    if (!this.monaco) {
      return;
    }

    const { theme } = this.props;
    const dark = theme === 'dark';
    const background = dark ? '2d3034' : 'ffffff';
    const gray = '899199';

    this.monaco.editor.defineTheme(theme, {
      base: theme === 'dark' ? 'vs-dark' : 'vs',
      inherit: true,
      rules: [
        { background },
        { token: 'attribute.name.html.md', foreground: gray },
        {
          token: 'keyword.md',
          foreground: dark ? 'dbdee0' : '2d3034',
          fontStyle: 'bold',
        },
        { token: 'string.escape.md', foreground: gray },
        { token: 'string.html.md', foreground: gray },
        { token: 'string.link.linkified', foreground: '4895d9' },
        { token: 'string.link.md', foreground: '4895d9' },
        { token: 'string.md', foreground: gray },
        { token: 'tag.md', foreground: gray },
        { token: 'variable.md', foreground: gray },
        { token: 'variable.source.md', foreground: gray },
      ],
      colors: {
        'editor.background': `#${background}`,
      },
    });

    this.monaco.editor.setTheme(theme);
  };

  storeContainer = ref => (this.container = ref);

  storeEditor = (editor, monaco) => {
    this.editor = editor;
    this.monaco = monaco;

    monaco.languages.register({ id: 'linkified' });
    monaco.languages.setMonarchTokensProvider('linkified', {
      tokenizer: {
        root: [[urlRegex({ strict: false }), 'string.link']],
      },
    });
    this.setLanguage();
    this.setTheme();

    editor.focus();
  };

  render() {
    const { markdownIsEnabled, theme } = this.props;
    const { height, width } = this.state;

    return (
      <div ref={this.storeContainer} style={{ width: '100%', height: '100%' }}>
        <MonacoEditor
          editorDidMount={this.storeEditor}
          width={width}
          height={height}
          language={markdownIsEnabled ? 'markdown' : 'linkified'}
          onChange={this.onChange}
          theme={theme}
          defaultValue={this.props.content}
          options={{
            lineNumbers: false,
            fontFamily: variableWidth,
            fontSize: 14,
            minimap: { enabled: false },
            renderLineHighlight: 'none',
            selectionHighlight: false,
            scrollbar: {
              useShadows: false,
            },
            wordWrap: 'on',
          }}
        />
      </div>
    );
  }
}

const mapStateToProps = state => ({
  lastPatch: getLastPatch(state, state.appState.selectedNoteId),
  theme: state.settings.theme,
});

export default connect(mapStateToProps)(Editor);
