import React from 'react';
import { connect } from 'react-redux';
import MonacoEditor from 'react-monaco-editor';
import urlRegex from 'url-regex';

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

  componentDidUpdate({ markdownIsEnabled, theme }) {
    if (theme !== this.props.theme) {
      this.setTheme();
    }

    if (markdownIsEnabled !== this.props.markdownIsEnabled) {
      this.setLanguage();
    }
  }

  // `event` left in for reference - passes the diff of changes
  // eslint-disable-next-line no-unused-vars
  onChange = (value, event) => {
    this.props.onChangeContent(value);
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
    const { content, markdownIsEnabled, theme } = this.props;
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
          value={content}
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
  theme: state.settings.theme,
});

export default connect(mapStateToProps)(Editor);
