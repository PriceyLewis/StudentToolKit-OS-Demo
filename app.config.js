module.exports = ({ config }) => {
  const githubPages = process.env.GITHUB_PAGES === "1";

  return {
    ...config,
    experiments: {
      ...config.experiments,
      ...(githubPages ? { baseUrl: "/StudentToolKit-OS-Demo" } : {}),
    },
  };
};
