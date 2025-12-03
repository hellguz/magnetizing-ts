import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs'],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  staticDirs: ['./public'],

  viteFinal: async (config) => {
    // Set the base path for GitHub Pages
    if (process.env.NODE_ENV === 'production') {
      config.base = '/_magnetizing-ts/';
    }
    return config;
  }
};

export default config;
