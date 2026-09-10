const pages = process.env.GITHUB_PAGES === 'true';
export default {
  ...(pages ? { output: 'export', basePath: '/forma-studio' } : {}),
  trailingSlash: true,
  env: { NEXT_PUBLIC_BASE_PATH: pages ? '/forma-studio' : '' },
};
