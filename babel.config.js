module.exports = function (api) {
  api.cache(true);

  const presets = [
    [
      '@babel/preset-env',
      {
        corejs: '3',
        useBuiltIns: 'entry',
        targets: {
          esmodules: true,
        },
      },
    ],
    '@babel/preset-react',
    '@babel/typescript',
  ];
  const plugins = [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-syntax-dynamic-import',
    '@babel/plugin-transform-runtime',
  ];
  const env = {
    development: {
      compact: false,
    },
    test: {
      plugins: ['dynamic-import-node'],
    },
  };

  return {
    sourceType: 'unambiguous',
    presets,
    plugins,
    env,
  };
};
